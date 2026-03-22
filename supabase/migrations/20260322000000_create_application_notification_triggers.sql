-- ========================================================================
-- 選考ステップのステータス変更時に通知を自動生成するトリガー関数
-- ========================================================================
CREATE OR REPLACE FUNCTION notify_application_step_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application record;
  v_title text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 親の応募情報を取得
  SELECT applicant_id, organization_id, id
  INTO v_application
  FROM applications
  WHERE id = NEW.application_id;

  IF v_application IS NULL THEN
    RETURN NEW;
  END IF;

  -- 新しいステータスに応じたタイトルを決定
  CASE NEW.status
    WHEN 'in_progress' THEN v_title := '選考が進みました';
    WHEN 'completed'   THEN v_title := 'ステップが完了しました';
    WHEN 'skipped'     THEN v_title := 'ステップがスキップされました';
    ELSE v_title := '選考ステップが更新されました';
  END CASE;

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
    NEW.label,
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

-- 選考ステップ更新トリガー
CREATE TRIGGER on_application_step_status_changed
  AFTER UPDATE OF status ON application_steps
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_application_step_change();

-- ========================================================================
-- 応募ステータス変更時に通知を自動生成するトリガー関数
-- ========================================================================
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_title text;
  v_title text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 求人タイトルを取得
  SELECT title INTO v_job_title
  FROM jobs
  WHERE id = NEW.job_id;

  -- 新しいステータスに応じたタイトルを決定
  CASE NEW.status
    WHEN 'offered'  THEN v_title := '内定のお知らせ';
    WHEN 'rejected' THEN v_title := '選考結果のお知らせ';
    ELSE v_title := '応募状況が更新されました';
  END CASE;

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
    NEW.organization_id,
    NEW.applicant_id,
    'recruitment_update',
    v_title,
    COALESCE(v_job_title, ''),
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

-- 応募ステータス更新トリガー
CREATE TRIGGER on_application_status_changed
  AFTER UPDATE OF status ON applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_application_status_change();
