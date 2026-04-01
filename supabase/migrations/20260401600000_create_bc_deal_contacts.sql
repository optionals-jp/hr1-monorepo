-- 商談-連絡先中間テーブル（複数連絡先紐付け + ステークホルダーロール）
CREATE TABLE IF NOT EXISTS bc_deal_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES bc_deals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES bc_contacts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'stakeholder',
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, contact_id)
);

-- インデックス
CREATE INDEX idx_bc_deal_contacts_org ON bc_deal_contacts(organization_id);
CREATE INDEX idx_bc_deal_contacts_deal ON bc_deal_contacts(deal_id);
CREATE INDEX idx_bc_deal_contacts_contact ON bc_deal_contacts(contact_id);

-- updated_at トリガー
CREATE TRIGGER trg_bc_deal_contacts_updated_at
  BEFORE UPDATE ON bc_deal_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE bc_deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_deal_contacts_select"
  ON bc_deal_contacts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_deal_contacts_insert"
  ON bc_deal_contacts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_deal_contacts_update"
  ON bc_deal_contacts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_deal_contacts_delete"
  ON bc_deal_contacts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));
