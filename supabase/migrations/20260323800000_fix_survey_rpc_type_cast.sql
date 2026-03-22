-- サーベイ回答トリガー関数の型不一致を修正
--
-- 根本原因: complete_todo_on_survey_response() トリガー関数で
-- employee_tasks.user_id (uuid型) と pulse_survey_responses.user_id (text型) を
-- 直接比較していたため "operator does not exist: uuid = text" エラーが発生。
--
-- 修正: NEW.user_id を uuid にキャストして比較する。

CREATE OR REPLACE FUNCTION complete_todo_on_survey_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_survey_id text;
BEGIN
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

  -- 社員タスクを完了（user_id を uuid にキャストして比較）
  UPDATE employee_tasks
  SET is_completed = true, completed_at = now()
  WHERE user_id = NEW.user_id::uuid
    AND title LIKE 'サーベイに回答: %'
    AND is_completed = false
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$;

-- submit_survey_response を元のシグネチャ (text, jsonb) で再作成
DROP FUNCTION IF EXISTS submit_survey_response(uuid, jsonb);
DROP FUNCTION IF EXISTS submit_survey_response(text, jsonb);
DROP FUNCTION IF EXISTS submit_survey_response(text, text);
DROP FUNCTION IF EXISTS submit_survey(text, text);

CREATE FUNCTION submit_survey_response(
  p_survey_id text,
  p_answers jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id text;
  v_org_id text;
  v_response_id uuid;
  v_survey_status text;
  v_survey_deadline timestamptz;
  v_survey_uuid uuid;
  v_answer jsonb;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが認証されていません';
  END IF;

  v_survey_uuid := p_survey_id::uuid;

  SELECT ps.status, ps.deadline, ps.organization_id
    INTO v_survey_status, v_survey_deadline, v_org_id
    FROM pulse_surveys ps
    WHERE ps.id = v_survey_uuid;

  IF v_survey_status IS NULL THEN
    RAISE EXCEPTION 'サーベイが見つかりません';
  END IF;
  IF v_survey_status != 'active' THEN
    RAISE EXCEPTION 'このサーベイは現在回答を受け付けていません';
  END IF;
  IF v_survey_deadline IS NOT NULL AND v_survey_deadline < now() THEN
    RAISE EXCEPTION 'このサーベイは締め切りを過ぎています';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = v_user_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'このサーベイへのアクセス権限がありません';
  END IF;

  INSERT INTO pulse_survey_responses (survey_id, organization_id, user_id, completed_at)
  VALUES (v_survey_uuid, v_org_id, v_user_id, now())
  ON CONFLICT (survey_id, user_id)
  DO UPDATE SET completed_at = now()
  RETURNING id INTO v_response_id;

  DELETE FROM pulse_survey_answers WHERE response_id = v_response_id;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    INSERT INTO pulse_survey_answers (response_id, question_id, value)
    VALUES (
      v_response_id,
      (v_answer->>'question_id')::uuid,
      v_answer->>'value'
    );
  END LOOP;

  RETURN v_response_id;
END;
$$;
