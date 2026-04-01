-- Phase 3 コードレビュー指摘対応マイグレーション

-- 1. トリガー命名統一: trg_ → set_ に統一（既存テーブルとの一貫性）
DROP TRIGGER IF EXISTS trg_bc_deal_contacts_updated_at ON public.bc_deal_contacts;
CREATE TRIGGER set_bc_deal_contacts_updated_at
  BEFORE UPDATE ON public.bc_deal_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bc_quotes_updated_at ON public.bc_quotes;
CREATE TRIGGER set_bc_quotes_updated_at
  BEFORE UPDATE ON public.bc_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bc_quote_items_updated_at ON public.bc_quote_items;
CREATE TRIGGER set_bc_quote_items_updated_at
  BEFORE UPDATE ON public.bc_quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. bc_quotes.created_by に FK 制約追加
ALTER TABLE public.bc_quotes
  ADD CONSTRAINT bc_quotes_created_by_fk
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. 金額フィールドに非負制約追加
ALTER TABLE public.bc_quotes
  ADD CONSTRAINT bc_quotes_subtotal_nonneg CHECK (subtotal >= 0),
  ADD CONSTRAINT bc_quotes_tax_amount_nonneg CHECK (tax_amount >= 0),
  ADD CONSTRAINT bc_quotes_total_nonneg CHECK (total >= 0),
  ADD CONSTRAINT bc_quotes_tax_rate_range CHECK (tax_rate >= 0 AND tax_rate <= 100);

ALTER TABLE public.bc_quote_items
  ADD CONSTRAINT bc_quote_items_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT bc_quote_items_unit_price_nonneg CHECK (unit_price >= 0),
  ADD CONSTRAINT bc_quote_items_amount_nonneg CHECK (amount >= 0);

-- 4. bc_deal_contacts.role に CHECK 制約追加
ALTER TABLE public.bc_deal_contacts
  ADD CONSTRAINT bc_deal_contacts_role_check
  CHECK (role IN ('decision_maker', 'influencer', 'champion', 'end_user', 'evaluator', 'stakeholder'));

-- 5. crm_pipeline_stages に updated_at カラム追加（レビューで漏れ検出）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_pipeline_stages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.crm_pipeline_stages ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    CREATE TRIGGER set_crm_pipeline_stages_updated_at
      BEFORE UPDATE ON public.crm_pipeline_stages
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6. bc_leads コンバート先参照のインデックス追加
CREATE INDEX IF NOT EXISTS idx_bc_leads_converted_company ON public.bc_leads(converted_company_id) WHERE converted_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bc_leads_converted_contact ON public.bc_leads(converted_contact_id) WHERE converted_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bc_leads_converted_deal ON public.bc_leads(converted_deal_id) WHERE converted_deal_id IS NOT NULL;

-- 7. bc_quote_items にインデックス追加（sort_order順取得の最適化）
CREATE INDEX IF NOT EXISTS idx_bc_quote_items_quote_sort ON public.bc_quote_items(quote_id, sort_order);
