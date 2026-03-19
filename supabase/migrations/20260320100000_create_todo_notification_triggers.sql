-- ========================================================================
-- サーベイ有効化時にTODO + 通知を自動生成するトリガー関数
-- ========================================================================
CREATE OR REPLACE FUNCTION create_survey_todos_and_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_todo_title text;
  v_notification_body text;
  v_action_url text;
BEGIN
  -- active に変更された場合のみ処理
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  v_todo_title := 'サーベイに回答: ' || NEW.title;
  v_notification_body := NEW.title;
  v_action_url := '/surveys/' || NEW.id::text;

  -- 応募者向け（target = 'applicant' or 'both'）
  IF NEW.target IN ('applicant', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'applicant'
    LOOP
      -- TODO作成
      INSERT INTO applicant_todos (
        organization_id, user_id, title, due_date, source, source_id, action_url
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'survey', NEW.id::text, v_action_url
      );

      -- 通知作成
      INSERT INTO notifications (
        organization_id, user_id, type, title, body, action_url,
        metadata
      ) VALUES (
        NEW.organization_id, v_user.user_id, 'survey_request',
        'サーベイの依頼', v_notification_body, v_action_url,
        jsonb_build_object('survey_id', NEW.id::text)
      );
    END LOOP;
  END IF;

  -- 社員向け（target = 'employee' or 'both'）
  IF NEW.target IN ('employee', 'both') THEN
    FOR v_user IN
      SELECT uo.user_id
      FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.organization_id = NEW.organization_id
        AND p.role = 'employee'
    LOOP
      -- 社員タスク作成
      INSERT INTO employee_tasks (
        organization_id, user_id, title, due_date, list_name
      ) VALUES (
        NEW.organization_id, v_user.user_id, v_todo_title,
        NEW.deadline::date, 'タスク'
      );

      -- 通知作成
      INSERT INTO notifications (
        organization_id, user_id, type, title, body, action_url,
        metadata
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

-- サーベイ有効化トリガー
CREATE TRIGGER on_pulse_survey_activated
  AFTER INSERT OR UPDATE OF status ON pulse_surveys
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION create_survey_todos_and_notifications();

-- ========================================================================
-- サーベイ回答時にTODOを自動完了するトリガー関数
-- ========================================================================
CREATE OR REPLACE FUNCTION complete_todo_on_survey_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_survey_id text;
BEGIN
  -- completed_at が設定されていない場合はスキップ
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_survey_id := NEW.survey_id::text;

  -- 応募者TODOを完了
  UPDATE applicant_todos
  SET is_completed = true, completed_at = now()
  WHERE source = 'survey'
    AND source_id = v_survey_id
    AND user_id = NEW.user_id
    AND is_completed = false;

  -- 社員タスクを完了（タイトルで照合）
  UPDATE employee_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = NEW.user_id
    AND title LIKE 'サーベイに回答: %'
    AND is_completed = false
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;

-- サーベイ回答トリガー
CREATE TRIGGER on_survey_response_completed
  AFTER INSERT OR UPDATE OF completed_at ON pulse_survey_responses
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION complete_todo_on_survey_response();
