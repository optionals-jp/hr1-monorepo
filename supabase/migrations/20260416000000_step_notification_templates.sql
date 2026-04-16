-- 選考ステップ通知のテンプレート対応
-- 1. notification_templates.trigger_event CHECK制約にステップ系イベントを追加
-- 2. notify_application_step_change() をテンプレート対応に更新

-- ============================================================
-- 1. CHECK制約の拡張（冪等）
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
        'step_in_progress',
        'step_completed',
        'step_skipped'
      ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. notify_application_step_change() テンプレート対応
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_application_step_change()
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
  v_trigger_event text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 親の応募情報と求人タイトルを取得
  SELECT a.applicant_id, a.organization_id, a.id, j.title AS job_title
  INTO v_application
  FROM applications a
  LEFT JOIN jobs j ON j.id = a.job_id
  WHERE a.id = NEW.application_id;

  IF v_application IS NULL THEN
    RETURN NEW;
  END IF;

  v_job_title := v_application.job_title;

  -- トリガーイベント名を決定
  v_trigger_event := 'step_' || NEW.status;

  -- 組織のテンプレートを検索
  SELECT title_template, body_template INTO v_template
  FROM notification_templates
  WHERE organization_id = v_application.organization_id
    AND trigger_event = v_trigger_event
    AND is_active = true;

  IF FOUND THEN
    v_title := replace(replace(v_template.title_template, '{step_label}', COALESCE(NEW.label, '')), '{job_title}', COALESCE(v_job_title, ''));
    v_body  := replace(replace(v_template.body_template,  '{step_label}', COALESCE(NEW.label, '')), '{job_title}', COALESCE(v_job_title, ''));
  ELSE
    -- フォールバック: 既存のハードコード
    CASE NEW.status
      WHEN 'in_progress' THEN v_title := '選考が進みました';
      WHEN 'completed'   THEN v_title := 'ステップが完了しました';
      WHEN 'skipped'     THEN v_title := 'ステップがスキップされました';
      ELSE v_title := '選考ステップが更新されました';
    END CASE;
    v_body := COALESCE(NEW.label, '');
  END IF;

  -- 通知レコードを作成
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
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;
