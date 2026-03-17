-- パルスサーベイ
CREATE TABLE pulse_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target text NOT NULL DEFAULT 'employee' CHECK (target IN ('applicant', 'employee', 'both')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  deadline timestamptz,
  created_by text NOT NULL DEFAULT auth.uid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- パルスサーベイ質問
CREATE TABLE pulse_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES pulse_surveys(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rating', 'text', 'single_choice', 'multiple_choice')),
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 選択式質問には options 必須
  CONSTRAINT ck_options_required CHECK (
    (type IN ('single_choice', 'multiple_choice') AND options IS NOT NULL AND jsonb_array_length(options) > 0)
    OR type NOT IN ('single_choice', 'multiple_choice')
  )
);

-- パルスサーベイ回答セッション
CREATE TABLE pulse_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES pulse_surveys(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(survey_id, user_id)
);

-- パルスサーベイ回答
CREATE TABLE pulse_survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES pulse_survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES pulse_survey_questions(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(response_id, question_id)
);

-- インデックス
CREATE INDEX idx_pulse_surveys_org_status ON pulse_surveys(organization_id, status);
CREATE INDEX idx_pulse_survey_questions_survey ON pulse_survey_questions(survey_id, sort_order);
CREATE INDEX idx_pulse_survey_responses_survey ON pulse_survey_responses(survey_id);
CREATE INDEX idx_pulse_survey_responses_user ON pulse_survey_responses(user_id);
CREATE INDEX idx_pulse_survey_answers_response ON pulse_survey_answers(response_id);

-- updated_at 自動更新（既存の update_updated_at_column() を使用）
CREATE TRIGGER pulse_surveys_updated_at
  BEFORE UPDATE ON pulse_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- RLS
-- ========================================================================
ALTER TABLE pulse_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_survey_answers ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- pulse_surveys: SELECT は組織メンバー全員、INSERT/UPDATE/DELETE は管理者のみ
-- ========================================================================
CREATE POLICY "pulse_surveys_select" ON pulse_surveys FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM user_organizations
    WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "pulse_surveys_insert_admin" ON pulse_surveys FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "pulse_surveys_update_admin" ON pulse_surveys FOR UPDATE USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "pulse_surveys_delete_admin" ON pulse_surveys FOR DELETE USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

-- ========================================================================
-- pulse_survey_questions: SELECT は組織メンバー、INSERT/UPDATE/DELETE は管理者かつ draft 時のみ
-- ========================================================================
CREATE POLICY "pulse_survey_questions_select" ON pulse_survey_questions FOR SELECT USING (
  survey_id IN (
    SELECT ps.id FROM pulse_surveys ps
    WHERE ps.organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "pulse_survey_questions_insert_admin" ON pulse_survey_questions FOR INSERT WITH CHECK (
  survey_id IN (
    SELECT ps.id FROM pulse_surveys ps
    WHERE ps.status = 'draft'
    AND ps.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

CREATE POLICY "pulse_survey_questions_update_admin" ON pulse_survey_questions FOR UPDATE USING (
  survey_id IN (
    SELECT ps.id FROM pulse_surveys ps
    WHERE ps.status = 'draft'
    AND ps.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

CREATE POLICY "pulse_survey_questions_delete_admin" ON pulse_survey_questions FOR DELETE USING (
  survey_id IN (
    SELECT ps.id FROM pulse_surveys ps
    WHERE ps.status = 'draft'
    AND ps.organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

-- ========================================================================
-- pulse_survey_responses: SELECT=自分+管理者、INSERT=アクティブかつ期限内の自分のみ、DELETE=管理者
-- ========================================================================
CREATE POLICY "pulse_survey_responses_select" ON pulse_survey_responses FOR SELECT USING (
  user_id = auth.uid()::text
  OR organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "pulse_survey_responses_insert" ON pulse_survey_responses FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
  AND survey_id IN (
    SELECT id FROM pulse_surveys
    WHERE status = 'active'
    AND (deadline IS NULL OR deadline > now())
  )
);

CREATE POLICY "pulse_survey_responses_update" ON pulse_survey_responses FOR UPDATE USING (
  user_id = auth.uid()::text
);

CREATE POLICY "pulse_survey_responses_delete_admin" ON pulse_survey_responses FOR DELETE USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
  )
);

-- ========================================================================
-- pulse_survey_answers: SELECT=自分+管理者、INSERT/UPDATE=自分のみ、DELETE=管理者
-- ========================================================================
CREATE POLICY "pulse_survey_answers_select" ON pulse_survey_answers FOR SELECT USING (
  response_id IN (
    SELECT id FROM pulse_survey_responses
    WHERE user_id = auth.uid()::text
    OR organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

CREATE POLICY "pulse_survey_answers_insert" ON pulse_survey_answers FOR INSERT WITH CHECK (
  response_id IN (SELECT id FROM pulse_survey_responses WHERE user_id = auth.uid()::text)
);

CREATE POLICY "pulse_survey_answers_update" ON pulse_survey_answers FOR UPDATE USING (
  response_id IN (SELECT id FROM pulse_survey_responses WHERE user_id = auth.uid()::text)
);

CREATE POLICY "pulse_survey_answers_delete_admin" ON pulse_survey_answers FOR DELETE USING (
  response_id IN (
    SELECT id FROM pulse_survey_responses
    WHERE organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  )
);

-- ========================================================================
-- RPC: アトミックなサーベイ回答送信
-- ========================================================================
CREATE OR REPLACE FUNCTION submit_survey_response(
  p_survey_id uuid,
  p_answers jsonb -- [{"question_id": "uuid", "value": "text"}, ...]
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
  v_answer jsonb;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが認証されていません';
  END IF;

  -- サーベイの存在・ステータス・期限を確認
  SELECT ps.status, ps.deadline, ps.organization_id
    INTO v_survey_status, v_survey_deadline, v_org_id
    FROM pulse_surveys ps
    WHERE ps.id = p_survey_id;

  IF v_survey_status IS NULL THEN
    RAISE EXCEPTION 'サーベイが見つかりません';
  END IF;
  IF v_survey_status != 'active' THEN
    RAISE EXCEPTION 'このサーベイは現在回答を受け付けていません';
  END IF;
  IF v_survey_deadline IS NOT NULL AND v_survey_deadline < now() THEN
    RAISE EXCEPTION 'このサーベイは締め切りを過ぎています';
  END IF;

  -- 組織メンバーシップの確認
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = v_user_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'このサーベイへのアクセス権限がありません';
  END IF;

  -- 回答セッションを upsert（再回答時は completed_at をサーバー時刻で上書き）
  INSERT INTO pulse_survey_responses (survey_id, organization_id, user_id, completed_at)
  VALUES (p_survey_id, v_org_id, v_user_id, now())
  ON CONFLICT (survey_id, user_id)
  DO UPDATE SET completed_at = now()
  RETURNING id INTO v_response_id;

  -- 既存の回答を削除して再挿入（再回答対応）
  DELETE FROM pulse_survey_answers WHERE response_id = v_response_id;

  -- 新しい回答を一括挿入
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
