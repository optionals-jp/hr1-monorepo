-- =============================================================================
-- Phase 3: 運用効率の改善
-- F2: notification_templates テーブル + トリガー更新
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. notification_templates テーブル
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id              uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id text        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_event   text        NOT NULL,
  title_template  text        NOT NULL,
  body_template   text        NOT NULL DEFAULT '',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notification_templates_trigger_event_check
    CHECK (trigger_event IN (
      'application_offered',
      'application_rejected',
      'application_offer_accepted',
      'application_offer_declined',
      'application_withdrawn'
    )),
  CONSTRAINT notification_templates_org_event_unique
    UNIQUE (organization_id, trigger_event)
);

COMMENT ON TABLE public.notification_templates IS '組織別の通知テンプレート';

-- updated_at トリガー
CREATE TRIGGER set_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_select_org
  ON public.notification_templates FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY notification_templates_all_admin
  ON public.notification_templates FOR ALL
  USING (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND public.get_my_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND public.get_my_role() IN ('admin', 'manager')
  );

-- GRANT
GRANT ALL ON TABLE public.notification_templates TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. notify_application_status_change() をテンプレート対応に更新
--    既存の offer_accepted/offer_declined ケースを保持
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title text;
  v_title text;
  v_body text;
  v_template record;
  v_trigger_event text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_job_title
  FROM jobs
  WHERE id = NEW.job_id;

  -- トリガーイベント名を決定
  v_trigger_event := 'application_' || NEW.status;

  -- 組織のテンプレートを検索
  SELECT title_template, body_template INTO v_template
  FROM notification_templates
  WHERE organization_id = NEW.organization_id
    AND trigger_event = v_trigger_event
    AND is_active = true;

  IF FOUND THEN
    v_title := replace(v_template.title_template, '{job_title}', COALESCE(v_job_title, ''));
    v_body := replace(v_template.body_template, '{job_title}', COALESCE(v_job_title, ''));
  ELSE
    -- フォールバック: 既存のハードコード
    CASE NEW.status
      WHEN 'offered'         THEN v_title := '内定のお知らせ';
      WHEN 'rejected'        THEN v_title := '選考結果のお知らせ';
      WHEN 'offer_accepted'  THEN v_title := '内定承諾を確認しました';
      WHEN 'offer_declined'  THEN v_title := '内定辞退のお知らせ';
      ELSE v_title := '応募状況が更新されました';
    END CASE;
    v_body := COALESCE(v_job_title, '');
  END IF;

  INSERT INTO notifications (
    organization_id, user_id, type, title, body, action_url, metadata
  ) VALUES (
    NEW.organization_id,
    NEW.applicant_id,
    'recruitment_update',
    v_title,
    v_body,
    '/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;
