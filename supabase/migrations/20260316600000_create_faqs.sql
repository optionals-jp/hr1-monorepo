-- FAQ テーブル
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,             -- Markdown 形式
  category text NOT NULL DEFAULT 'general',
  target text NOT NULL DEFAULT 'both' CHECK (target IN ('employee', 'applicant', 'both')),
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX faqs_org_id_idx ON faqs (organization_id);
CREATE INDEX faqs_target_idx ON faqs (target);

-- updated_at 自動更新
CREATE TRIGGER faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- 同じ組織のユーザーは閲覧可能
CREATE POLICY "faqs_select_org" ON faqs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()::text
    )
  );

-- 管理者のみ作成・更新・削除
CREATE POLICY "faqs_insert_admin" ON faqs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "faqs_update_admin" ON faqs
  FOR UPDATE USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY "faqs_delete_admin" ON faqs
  FOR DELETE USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organizations uo
      JOIN profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text AND p.role IN ('admin', 'hr_manager')
    )
  );
