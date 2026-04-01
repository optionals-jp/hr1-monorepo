-- =============================================
-- Phase 3 Step 1: リード管理
-- =============================================

CREATE TABLE public.bc_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'other'
    CHECK (source IN ('web', 'referral', 'event', 'cold_call', 'other')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  -- コンバージョン後の参照
  converted_company_id uuid REFERENCES public.bc_companies(id) ON DELETE SET NULL,
  converted_contact_id uuid REFERENCES public.bc_contacts(id) ON DELETE SET NULL,
  converted_deal_id uuid REFERENCES public.bc_deals(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_bc_leads_org ON public.bc_leads(organization_id);
CREATE INDEX idx_bc_leads_status ON public.bc_leads(organization_id, status);
CREATE INDEX idx_bc_leads_assigned ON public.bc_leads(assigned_to);

-- RLS
ALTER TABLE public.bc_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_leads_select" ON public.bc_leads
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bc_leads_insert" ON public.bc_leads
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bc_leads_update" ON public.bc_leads
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bc_leads_delete" ON public.bc_leads
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- updated_at トリガー
CREATE TRIGGER set_bc_leads_updated_at
  BEFORE UPDATE ON public.bc_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
