-- ========================================================================
-- コードレビュー指摘事項の修正
-- ========================================================================

-- ========================================================================
-- RLS再帰防止用ヘルパー関数
-- profiles と user_organizations の相互参照による無限再帰を防ぐため、
-- SECURITY DEFINER でRLSを迂回してロール・組織IDを取得する。
-- ========================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.get_my_organization_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text;
$$;

-- ========================================================================
-- 🔴1: 初期テーブルの RLS ポリシー追加
-- CREATE TABLE IF NOT EXISTS で作成されたテーブルのうち、
-- 既存環境ではポリシーが存在するが、新規環境では未定義になるものを補完
-- ========================================================================

-- organizations: 組織メンバーのみ閲覧、管理者のみ変更
DO $$ BEGIN
  CREATE POLICY "org_select_member" ON public.organizations FOR SELECT
    USING (id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "org_all_admin" ON public.organizations FOR ALL
    USING (id IN (SELECT public.get_my_organization_ids()) AND public.get_my_role() = 'admin')
    WITH CHECK (id IN (SELECT public.get_my_organization_ids()) AND public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles: 自分のプロフィール閲覧・更新 + 同組織メンバー閲覧
DO $$ BEGIN
  CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
    USING (id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_select_org_member" ON public.profiles FOR SELECT
    USING (id IN (
      SELECT uo.user_id FROM public.user_organizations uo
      WHERE uo.organization_id IN (SELECT public.get_my_organization_ids())
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
    USING (id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_all_admin" ON public.profiles FOR ALL
    USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_organizations: 自分のレコード閲覧 + 同組織メンバー閲覧 + 管理者管理
DO $$ BEGIN
  CREATE POLICY "user_org_select_own" ON public.user_organizations FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_org_select_org_member は削除（user_org_select_own + user_org_all_admin で十分カバー）

DO $$ BEGIN
  CREATE POLICY "user_org_all_admin" ON public.user_organizations FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- jobs: 組織メンバー閲覧 + 管理者管理
DO $$ BEGIN
  CREATE POLICY "jobs_select_org" ON public.jobs FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "jobs_all_admin" ON public.jobs FOR ALL
    USING (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()))
    WITH CHECK (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- applications: 自分の応募閲覧 + 管理者管理
DO $$ BEGIN
  CREATE POLICY "applications_select_own" ON public.applications FOR SELECT
    USING (applicant_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT
    WITH CHECK (applicant_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "applications_all_admin" ON public.applications FOR ALL
    USING (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- departments: 組織メンバー閲覧 + 管理者管理
DO $$ BEGIN
  CREATE POLICY "departments_select_org" ON public.departments FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "departments_all_admin" ON public.departments FOR ALL
    USING (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- messages: スレッド参加者のみ
DO $$ BEGIN
  CREATE POLICY "messages_select_thread_member" ON public.messages FOR SELECT
    USING (thread_id IN (
      SELECT id FROM public.message_threads
      WHERE participant_id = auth.uid()::text
        OR (organization_id IN (SELECT public.get_my_organization_ids())
            AND public.get_my_role() IN ('admin', 'employee'))
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages_insert_authenticated" ON public.messages FOR INSERT
    WITH CHECK (sender_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE
    USING (sender_id = auth.uid()::text OR (
      public.get_my_role() IN ('admin', 'employee')
      AND thread_id IN (
        SELECT id FROM public.message_threads mt
        WHERE mt.organization_id IN (SELECT public.get_my_organization_ids())
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- message_threads: 参加者 + 組織管理者
DO $$ BEGIN
  CREATE POLICY "threads_select" ON public.message_threads FOR SELECT
    USING (
      participant_id = auth.uid()::text
      OR (organization_id IN (SELECT public.get_my_organization_ids())
          AND public.get_my_role() IN ('admin', 'employee'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "threads_all_admin" ON public.message_threads FOR ALL
    USING (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tasks, task_assignees, projects 等: 組織メンバー閲覧 + 管理者管理
DO $$ BEGIN
  CREATE POLICY "tasks_select_org" ON public.tasks FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "tasks_all_admin" ON public.tasks FOR ALL
    USING (public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 🔴2: employee_departments.user_id に FK 制約追加
-- ========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_departments_user_id_fkey'
      AND table_name = 'employee_departments'
  ) THEN
    ALTER TABLE public.employee_departments
      ADD CONSTRAINT employee_departments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================================================
-- 🔴4: SECURITY DEFINER 関数内のスキーマ修飾
-- ========================================================================
CREATE OR REPLACE FUNCTION complete_todo_on_survey_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey_id text;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_survey_id := NEW.survey_id::text;

  UPDATE public.applicant_todos
  SET is_completed = true, completed_at = now()
  WHERE source = 'survey'
    AND source_id = v_survey_id
    AND user_id = NEW.user_id
    AND is_completed = false;

  UPDATE public.employee_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = NEW.user_id
    AND title LIKE 'サーベイに回答: %'
    AND is_completed = false
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_survey_todos_and_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_todo_title text;
  v_notification_body text;
  v_action_url text;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  v_todo_title := 'サーベイに回答: ' || NEW.title;
  v_notification_body := NEW.title;
  v_action_url := '/surveys/' || NEW.id::text;

  IF NEW.target IN ('applicant', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'applicant'
    LOOP
      INSERT INTO public.applicant_todos (
        organization_id, user_id, title, due_date, source, source_id, action_url
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'survey', NEW.id::text, v_action_url
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  IF NEW.target IN ('employee', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'employee'
    LOOP
      INSERT INTO public.employee_tasks (
        organization_id, user_id, title, due_date, list_name
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'タスク'
      );

      INSERT INTO public.notifications (
        organization_id, user_id, type, title, body, action_url, metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- send_push_on_notification_insert にも search_path を追加
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  IF _supabase_url IS NULL OR _service_role_key IS NULL THEN
    INSERT INTO public.push_notification_logs (notification_id, user_id, status, error_message)
    VALUES (NEW.id, NEW.user_id, 'skipped', 'app.settings.supabase_url or service_role_key not configured');
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM extensions.http_post(
      url := _supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', COALESCE(NEW.body, ''),
        'action_url', NEW.action_url
      )
    );

    INSERT INTO public.push_notification_logs (notification_id, user_id, status)
    VALUES (NEW.id, NEW.user_id, 'sent');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.push_notification_logs (notification_id, user_id, status, error_message)
    VALUES (NEW.id, NEW.user_id, 'failed', SQLERRM);
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- ========================================================================
-- 🔴5: create_user_with_org の department_ids 型を uuid[] に変更
-- ========================================================================
DROP FUNCTION IF EXISTS public.create_user_with_org(text, text, text, text, text, text, text, integer, text[]);

CREATE OR REPLACE FUNCTION public.create_user_with_org(
  p_user_id text,
  p_email text,
  p_display_name text DEFAULT NULL,
  p_role text DEFAULT 'employee',
  p_organization_id text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_hiring_type text DEFAULT NULL,
  p_graduation_year integer DEFAULT NULL,
  p_department_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, position, hiring_type, graduation_year)
  VALUES (p_user_id, p_email, p_display_name, p_role, p_position, p_hiring_type, p_graduation_year);

  IF p_organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    VALUES (p_user_id, p_organization_id);
  END IF;

  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY p_department_ids
    LOOP
      INSERT INTO public.employee_departments (user_id, department_id)
      VALUES (p_user_id, v_dept_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', p_user_id, 'email', p_email);
END;
$$;

-- ========================================================================
-- 🟡: 勤怠集計 RPC の COLLATE をフォールバック対応
-- ========================================================================
CREATE OR REPLACE FUNCTION public.get_monthly_attendance_summary(
  p_organization_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  user_id text,
  display_name text,
  email text,
  present_days bigint,
  late_days bigint,
  absent_days bigint,
  leave_days bigint,
  total_work_minutes bigint,
  total_overtime_minutes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text
      AND uo.organization_id = p_organization_id
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    ar.user_id,
    p.display_name,
    p.email,
    COUNT(*) FILTER (WHERE ar.status IN ('present', 'late', 'early_leave')) AS present_days,
    COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
    COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
    COUNT(*) FILTER (WHERE ar.status IN ('paid_leave', 'half_day_am', 'half_day_pm', 'sick_leave', 'special_leave')) AS leave_days,
    COALESCE(SUM(
      CASE WHEN ar.clock_in IS NOT NULL AND ar.clock_out IS NOT NULL
        THEN GREATEST(
          EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))::bigint / 60 - ar.break_minutes,
          0
        )
        ELSE 0
      END
    ), 0) AS total_work_minutes,
    COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes
  FROM public.attendance_records ar
  JOIN public.profiles p ON p.id = ar.user_id
  WHERE ar.organization_id = p_organization_id
    AND ar.date >= p_start_date
    AND ar.date <= p_end_date
  GROUP BY ar.user_id, p.display_name, p.email
  ORDER BY p.display_name NULLS LAST, p.email;
END;
$$;
