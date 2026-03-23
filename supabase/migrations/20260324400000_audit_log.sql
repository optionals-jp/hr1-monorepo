-- ========================================================================
-- hstore拡張（差分計算用）
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS hstore;

-- ========================================================================
-- 統一監査ログテーブル
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number bigserial NOT NULL,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  user_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name text NOT NULL,
  record_id text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}',
  metadata jsonb,
  ip_address text,
  user_agent text,
  source text NOT NULL DEFAULT 'trigger' CHECK (source IN ('trigger', 'console', 'api', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========================================================================
-- インデックス
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_table_created ON audit_logs(organization_id, table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sequence ON audit_logs(sequence_number);

-- ========================================================================
-- RLS
-- ========================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "管理者が監査ログを閲覧"
    ON public.audit_logs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text
          AND uo.organization_id = audit_logs.organization_id
          AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
        AND uo.organization_id = audit_logs.organization_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "audit_logs_deny_update" ON public.audit_logs FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "audit_logs_deny_delete" ON public.audit_logs FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- エラーログテーブル
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  table_name text,
  record_id text,
  operation text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs_errors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audit_logs_errors_select_admin" ON public.audit_logs_errors FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()::text AND p.role = 'admin'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 汎用トリガー関数
-- ========================================================================

CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_record_id text;
  v_org_id text;
  v_user_id text;
  v_changes jsonb;
  v_old jsonb;
  v_new jsonb;
  v_old_hstore hstore;
  v_new_hstore hstore;
  v_diff hstore;
  v_key text;
  v_excluded_keys text[] := ARRAY['id', 'created_at', 'updated_at'];
BEGIN
  v_user_id := coalesce(auth.uid()::text, 'system');

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := v_old ->> 'id';
    v_org_id := v_old ->> 'organization_id';
    v_changes := v_old;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';
    v_changes := v_new;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := v_new ->> 'id';
    v_org_id := v_new ->> 'organization_id';

    v_old_hstore := hstore(OLD);
    v_new_hstore := hstore(NEW);
    v_diff := v_new_hstore - v_old_hstore;

    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT skeys(v_diff)
    LOOP
      IF v_key != ALL(v_excluded_keys) THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key)
        );
      END IF;
    END LOOP;

    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- organization_idがないテーブル（profiles等）はuser_organizationsから取得
  IF v_org_id IS NULL THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      SELECT uo.organization_id INTO v_org_id
      FROM public.user_organizations uo
      WHERE uo.user_id = v_record_id
      LIMIT 1;
    END IF;

    IF v_org_id IS NULL THEN
      RAISE WARNING 'audit_log: organization_id is NULL for table=%, record_id=%, op=%',
        TG_TABLE_NAME, v_record_id, TG_OP;

      BEGIN
        INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
        VALUES (
          'organization_id is NULL',
          TG_TABLE_NAME,
          v_record_id,
          TG_OP,
          v_changes
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'audit_log: failed to log error: %', SQLERRM;
      END;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes)
    VALUES (v_org_id, v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_changes);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data)
    VALUES (SQLERRM, TG_TABLE_NAME, v_record_id, TG_OP, v_changes);
    RAISE WARNING 'audit_log: INSERT failed for table=%, record_id=%: %', TG_TABLE_NAME, v_record_id, SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ========================================================================
-- トリガー設定
-- ========================================================================

DROP TRIGGER IF EXISTS audit_trigger_jobs ON public.jobs;
CREATE TRIGGER audit_trigger_jobs
  AFTER INSERT OR UPDATE OR DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_applications ON public.applications;
CREATE TRIGGER audit_trigger_applications
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_interviews ON public.interviews;
CREATE TRIGGER audit_trigger_interviews
  AFTER INSERT OR UPDATE OR DELETE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_custom_forms ON public.custom_forms;
CREATE TRIGGER audit_trigger_custom_forms
  AFTER INSERT OR UPDATE OR DELETE ON public.custom_forms
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_evaluation_templates ON public.evaluation_templates;
CREATE TRIGGER audit_trigger_evaluation_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_evaluation_cycles ON public.evaluation_cycles;
CREATE TRIGGER audit_trigger_evaluation_cycles
  AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_workflow_requests ON public.workflow_requests;
CREATE TRIGGER audit_trigger_workflow_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_attendance_records ON public.attendance_records;
CREATE TRIGGER audit_trigger_attendance_records
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_profiles ON public.profiles;
CREATE TRIGGER audit_trigger_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_payslips ON public.payslips;
CREATE TRIGGER audit_trigger_payslips
  AFTER INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_leave_balances ON public.leave_balances;
CREATE TRIGGER audit_trigger_leave_balances
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_user_organizations ON public.user_organizations;
CREATE TRIGGER audit_trigger_user_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.user_organizations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_trigger_departments ON public.departments;
CREATE TRIGGER audit_trigger_departments
  AFTER INSERT OR UPDATE OR DELETE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

-- ========================================================================
-- 既存データ移行
-- ========================================================================

INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes, metadata, created_at)
SELECT
  j.organization_id,
  coalesce(cl.changed_by, 'system'),
  CASE
    WHEN cl.change_type = 'created' THEN 'create'
    WHEN cl.change_type LIKE '%_added' THEN 'create'
    WHEN cl.change_type LIKE '%_deleted' THEN 'delete'
    ELSE 'update'
  END,
  'jobs',
  cl.job_id::text,
  jsonb_build_object('summary', cl.summary, 'details', cl.details),
  jsonb_build_object('detail_action', cl.change_type),
  cl.created_at
FROM public.job_change_logs cl
LEFT JOIN public.jobs j ON j.id = cl.job_id
WHERE j.organization_id IS NOT NULL;

INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data, created_at)
SELECT
  'orphaned record: job not found',
  'jobs',
  cl.job_id::text,
  cl.change_type,
  jsonb_build_object('summary', cl.summary, 'details', cl.details, 'changed_by', cl.changed_by),
  cl.created_at
FROM public.job_change_logs cl
LEFT JOIN public.jobs j ON j.id = cl.job_id
WHERE j.id IS NULL;

INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes, metadata, created_at)
SELECT
  i.organization_id,
  coalesce(cl.changed_by, 'system'),
  CASE
    WHEN cl.change_type = 'created' THEN 'create'
    WHEN cl.change_type LIKE '%_added' THEN 'create'
    WHEN cl.change_type LIKE '%_deleted' THEN 'delete'
    ELSE 'update'
  END,
  'interviews',
  cl.interview_id::text,
  jsonb_build_object('summary', cl.summary, 'details', cl.details),
  jsonb_build_object('detail_action', cl.change_type),
  cl.created_at
FROM public.interview_change_logs cl
LEFT JOIN public.interviews i ON i.id = cl.interview_id
WHERE i.organization_id IS NOT NULL;

INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data, created_at)
SELECT
  'orphaned record: interview not found',
  'interviews',
  cl.interview_id::text,
  cl.change_type,
  jsonb_build_object('summary', cl.summary, 'details', cl.details, 'changed_by', cl.changed_by),
  cl.created_at
FROM public.interview_change_logs cl
LEFT JOIN public.interviews i ON i.id = cl.interview_id
WHERE i.id IS NULL;

INSERT INTO public.audit_logs (organization_id, user_id, action, table_name, record_id, changes, metadata, created_at)
SELECT
  cf.organization_id,
  coalesce(cl.changed_by, 'system'),
  CASE
    WHEN cl.change_type = 'created' THEN 'create'
    WHEN cl.change_type LIKE '%_added' THEN 'create'
    WHEN cl.change_type LIKE '%_deleted' THEN 'delete'
    ELSE 'update'
  END,
  'custom_forms',
  cl.form_id::text,
  jsonb_build_object('summary', cl.summary, 'details', cl.details),
  jsonb_build_object('detail_action', cl.change_type),
  cl.created_at
FROM public.form_change_logs cl
LEFT JOIN public.custom_forms cf ON cf.id = cl.form_id
WHERE cf.organization_id IS NOT NULL;

INSERT INTO public.audit_logs_errors (error_message, table_name, record_id, operation, raw_data, created_at)
SELECT
  'orphaned record: custom_form not found',
  'custom_forms',
  cl.form_id::text,
  cl.change_type,
  jsonb_build_object('summary', cl.summary, 'details', cl.details, 'changed_by', cl.changed_by),
  cl.created_at
FROM public.form_change_logs cl
LEFT JOIN public.custom_forms cf ON cf.id = cl.form_id
WHERE cf.id IS NULL;

-- ========================================================================
-- 旧テーブル削除
-- ========================================================================

DROP TABLE IF EXISTS public.job_change_logs;
DROP TABLE IF EXISTS public.interview_change_logs;
DROP TABLE IF EXISTS public.form_change_logs;

-- ========================================================================
-- アーカイブテーブル
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs_archive (LIKE public.audit_logs INCLUDING DEFAULTS);
ALTER TABLE public.audit_logs_archive ALTER COLUMN sequence_number DROP DEFAULT;
ALTER TABLE public.audit_logs_archive ALTER COLUMN sequence_number TYPE bigint;

ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "archive_select_admin" ON audit_logs_archive FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
      AND uo.organization_id = audit_logs_archive.organization_id
      AND p.role = 'admin'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "archive_deny_update" ON audit_logs_archive FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "archive_deny_delete" ON audit_logs_archive FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "archive_deny_insert" ON audit_logs_archive FOR INSERT WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- アーカイブ関数
-- ========================================================================

CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(retention_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  WITH to_archive AS (
    DELETE FROM audit_logs
    WHERE created_at < now() - (retention_days || ' days')::interval
    RETURNING *
  )
  INSERT INTO audit_logs_archive SELECT * FROM to_archive;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
