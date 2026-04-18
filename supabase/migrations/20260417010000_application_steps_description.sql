-- Phase 2: 個別応募ステップに「追加で対応してもらいたい内容」を記述するための description カラムを追加する
--
-- 1. application_steps.description: 候補者ごとに表示される追加指示・依頼内容（任意, text, nullable）
-- 2. job_steps.description: 求人ごとのステップ既定説明（任意, text, nullable）
--    - selection_step_templates.description は既に存在する
--    - 求人作成 → 応募作成のフロー（テンプレ → job_steps → application_steps）で
--      description を引き継げるようにする
-- 3. step_added 通知テンプレで {step_description} プレースホルダを使えるよう、
--    既存のトリガ関数 notify_application_step_added を更新する

-- ============================================================
-- 1. カラム追加
-- ============================================================
ALTER TABLE public.application_steps
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.job_steps
  ADD COLUMN IF NOT EXISTS description text;

-- ============================================================
-- 2. step_added 通知トリガを更新（description を本文に含められるようにする）
--    既存ロジックは保ちつつ、{step_description} プレースホルダを差し替える。
--    description が NULL の場合は空文字に置換し、本文崩れを避ける。
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
    v_title := replace(
      replace(
        replace(v_template.title_template, '{step_label}', COALESCE(NEW.label, '')),
        '{job_title}', COALESCE(v_job_title, '')
      ),
      '{step_description}', COALESCE(NEW.description, '')
    );
    v_body := replace(
      replace(
        replace(v_template.body_template, '{step_label}', COALESCE(NEW.label, '')),
        '{job_title}', COALESCE(v_job_title, '')
      ),
      '{step_description}', COALESCE(NEW.description, '')
    );
  ELSE
    v_title := '選考ステップが追加されました';
    -- description があれば本文に含める。長文も想定されるためそのまま渡す。
    v_body := COALESCE(NULLIF(NEW.description, ''), COALESCE(NEW.label, ''));
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
