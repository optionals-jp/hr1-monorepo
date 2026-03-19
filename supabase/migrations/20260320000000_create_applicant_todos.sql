-- 応募者TODOテーブル
CREATE TABLE applicant_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  title text NOT NULL,
  note text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_important boolean NOT NULL DEFAULT false,
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'survey', 'form', 'interview', 'system')),
  source_id text,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_applicant_todos_user_created ON applicant_todos(user_id, created_at DESC);
CREATE INDEX idx_applicant_todos_user_incomplete ON applicant_todos(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX idx_applicant_todos_org ON applicant_todos(organization_id);
CREATE INDEX idx_applicant_todos_source ON applicant_todos(source, source_id);

-- updated_at 自動更新
CREATE TRIGGER applicant_todos_updated_at
  BEFORE UPDATE ON applicant_todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- RLS
-- ========================================================================
ALTER TABLE applicant_todos ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のTODOのみ
CREATE POLICY "applicant_todos_select_own" ON applicant_todos FOR SELECT USING (
  user_id = auth.uid()::text
);

-- INSERT: 自分のTODO作成（手動）+ トリガー関数はSECURITY DEFINERで別途処理
CREATE POLICY "applicant_todos_insert_own" ON applicant_todos FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
);

-- UPDATE: 自分のTODOのみ（完了マーク・編集用）
CREATE POLICY "applicant_todos_update_own" ON applicant_todos FOR UPDATE USING (
  user_id = auth.uid()::text
);

-- DELETE: 自分のTODOのみ
CREATE POLICY "applicant_todos_delete_own" ON applicant_todos FOR DELETE USING (
  user_id = auth.uid()::text
);
