-- 見積書テーブル
CREATE TABLE IF NOT EXISTS bc_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES bc_deals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES bc_companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES bc_contacts(id) ON DELETE SET NULL,
  quote_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  subtotal bigint NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  tax_amount bigint NOT NULL DEFAULT 0,
  total bigint NOT NULL DEFAULT 0,
  notes text,
  terms text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 見積書明細テーブル
CREATE TABLE IF NOT EXISTS bc_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES bc_quotes(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT '式',
  unit_price bigint NOT NULL DEFAULT 0,
  amount bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_bc_quotes_org ON bc_quotes(organization_id);
CREATE INDEX idx_bc_quotes_deal ON bc_quotes(deal_id);
CREATE INDEX idx_bc_quotes_company ON bc_quotes(company_id);
CREATE INDEX idx_bc_quotes_status ON bc_quotes(organization_id, status);
CREATE INDEX idx_bc_quote_items_quote ON bc_quote_items(quote_id);

-- updated_at トリガー
CREATE TRIGGER trg_bc_quotes_updated_at
  BEFORE UPDATE ON bc_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bc_quote_items_updated_at
  BEFORE UPDATE ON bc_quote_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: bc_quotes
ALTER TABLE bc_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_quotes_select"
  ON bc_quotes FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_quotes_insert"
  ON bc_quotes FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_quotes_update"
  ON bc_quotes FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "bc_quotes_delete"
  ON bc_quotes FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- RLS: bc_quote_items（親のbc_quotesのRLS経由でアクセス制御）
ALTER TABLE bc_quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_quote_items_select"
  ON bc_quote_items FOR SELECT
  USING (quote_id IN (
    SELECT id FROM bc_quotes WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "bc_quote_items_insert"
  ON bc_quote_items FOR INSERT
  WITH CHECK (quote_id IN (
    SELECT id FROM bc_quotes WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "bc_quote_items_update"
  ON bc_quote_items FOR UPDATE
  USING (quote_id IN (
    SELECT id FROM bc_quotes WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "bc_quote_items_delete"
  ON bc_quote_items FOR DELETE
  USING (quote_id IN (
    SELECT id FROM bc_quotes WHERE organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  ));
