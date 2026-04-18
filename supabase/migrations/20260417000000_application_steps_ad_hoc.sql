-- 個別応募に対して人事担当者がアドホックなステップを追加できるようにする
--
-- Phase 1:
-- 1. application_steps に source / created_by_user_id / is_optional を追加
-- 2. step_order を numeric に変更（ステップ間への挿入時に再採番不要にするため）
-- 3. 人事担当者向け RLS を分割（INSERT は ad_hoc のみ、UPDATE/DELETE は ad_hoc かつ pending のみ）
-- 4. 通知テンプレートに step_added イベントを追加
-- 5. INSERT トリガを追加し、ad_hoc ステップ追加時に応募者へ通知

-- ============================================================
-- 1. カラム追加
-- ============================================================
ALTER TABLE public.application_steps
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'flow',
  ADD COLUMN IF NOT EXISTS created_by_user_id text REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.application_steps
    DROP CONSTRAINT IF EXISTS application_steps_source_check;

  ALTER TABLE public.application_steps
    ADD CONSTRAINT application_steps_source_check
      CHECK (source IN ('flow', 'ad_hoc'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. step_order を integer から numeric に変更
--    （ステップ間への挿入で 1.5 のような中間値を持てるようにする）
-- ============================================================
ALTER TABLE public.application_steps
  ALTER COLUMN step_order TYPE numeric USING step_order::numeric;

ALTER TABLE public.application_steps
  ALTER COLUMN step_order SET DEFAULT 0;

-- ============================================================
-- 3. 人事担当者向け RLS の再構成
--    旧 app_steps_all_admin は破壊的操作も無制限に許していたため、
--    INSERT は source='ad_hoc' のみ、UPDATE/DELETE は ad_hoc かつ pending のみに制限する。
--    SELECT は組織管理者であれば全件閲覧可。
-- ============================================================
DROP POLICY IF EXISTS "app_steps_all_admin" ON public.application_steps;

CREATE POLICY "app_steps_select_admin" ON public.application_steps
  FOR SELECT
  USING (
    application_id IN (
      SELECT a.id
      FROM public.applications a
      JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = (auth.uid())::text
        AND p.role = 'admin'
    )
  );

CREATE POLICY "app_steps_insert_admin_ad_hoc" ON public.application_steps
  FOR INSERT
  WITH CHECK (
    source = 'ad_hoc'
    AND application_id IN (
      SELECT a.id
      FROM public.applications a
      JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = (auth.uid())::text
        AND p.role = 'admin'
    )
  );

CREATE POLICY "app_steps_update_admin" ON public.application_steps
  FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id
      FROM public.applications a
      JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = (auth.uid())::text
        AND p.role = 'admin'
    )
    -- フローから自動生成されたステップの構造変更（label/step_type 等）はテンプレ管理経由で行う。
    -- ここでは進行管理に関する更新（status, started_at, completed_at, form_id, interview_id, document_url, applicant_action_at）と
    -- ad_hoc かつ pending の編集を許す。
    AND (
      source = 'flow'
      OR (source = 'ad_hoc' AND status = 'pending')
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT a.id
      FROM public.applications a
      JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = (auth.uid())::text
        AND p.role = 'admin'
    )
  );

CREATE POLICY "app_steps_delete_admin_ad_hoc_pending" ON public.application_steps
  FOR DELETE
  USING (
    source = 'ad_hoc'
    AND status = 'pending'
    AND application_id IN (
      SELECT a.id
      FROM public.applications a
      JOIN public.user_organizations uo ON uo.organization_id = a.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = (auth.uid())::text
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 4. 通知テンプレートに step_added を追加
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.notification_templates
    DROP CONSTRAINT IF EXISTS notification_templates_trigger_event_check;

  ALTER TABLE public.notification_templates
    ADD CONSTRAINT notification_templates_trigger_event_check
      CHECK (trigger_event IN (
        'application_offered',
        'application_rejected',
        'application_offer_accepted',
        'application_offer_declined',
        'application_withdrawn',
        'step_added',
        'step_in_progress',
        'step_completed',
        'step_skipped'
      ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. ad_hoc ステップ INSERT 時の通知トリガ
--    既存の notify_application_step_change は UPDATE OF status のみで発火するため、
--    INSERT 用に専用関数 + トリガを追加する。
--    バルクINSERT（応募作成時のテンプレ展開）に通知を出さないよう、
--    WHEN (NEW.source = 'ad_hoc') でガードする。
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_application_step_added()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application record;
  v_job_title text;
  v_title text;
  v_body text;
  v_template record;
BEGIN
  SELECT a.applicant_id, a.organization_id, a.id, j.title AS job_title
  INTO v_application
  FROM applications a
  LEFT JOIN jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF v_application IS NULL THEN
    RETURN NEW;
  END IF;

  v_job_title := v_application.job_title;

  SELECT title_template, body_template INTO v_template
  FROM notification_templates
  WHERE organization_id = v_application.organization_id
    AND trigger_event = 'step_added'
    AND is_active = true;

  IF FOUND THEN
    v_title := replace(replace(v_template.title_template, '{step_label}', COALESCE(NEW.label, '')), '{job_title}', COALESCE(v_job_title, ''));
    v_body  := replace(replace(v_template.body_template,  '{step_label}', COALESCE(NEW.label, '')), '{job_title}', COALESCE(v_job_title, ''));
  ELSE
    v_title := '選考ステップが追加されました';
    v_body := COALESCE(NEW.label, '');
  END IF;

  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  ) VALUES (
    v_application.organization_id,
    v_application.applicant_id,
    'recruitment_update',
    v_title,
    v_body,
    '/applications/' || v_application.id,
    jsonb_build_object(
      'application_id', v_application.id,
      'step_id', NEW.id,
      'event', 'step_added'
    )
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_application_step_added() OWNER TO postgres;

GRANT ALL ON FUNCTION public.notify_application_step_added() TO anon;
GRANT ALL ON FUNCTION public.notify_application_step_added() TO authenticated;
GRANT ALL ON FUNCTION public.notify_application_step_added() TO service_role;

DROP TRIGGER IF EXISTS on_application_step_inserted_ad_hoc ON public.application_steps;

CREATE TRIGGER on_application_step_inserted_ad_hoc
AFTER INSERT ON public.application_steps
FOR EACH ROW
WHEN (NEW.source = 'ad_hoc')
EXECUTE FUNCTION public.notify_application_step_added();
