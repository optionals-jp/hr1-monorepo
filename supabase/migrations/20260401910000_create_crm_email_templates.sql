-- Phase 4: CRM メールテンプレート
-- 商談・リードへの定型メール送信を支援

CREATE TABLE IF NOT EXISTS public.crm_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  -- テンプレート変数: {{contact_name}}, {{company_name}}, {{deal_title}} 等
  category text NOT NULL DEFAULT 'general' CHECK (category IN (
    'general', 'follow_up', 'proposal', 'thank_you', 'introduction', 'reminder'
  )),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_crm_email_templates_org ON public.crm_email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_email_templates_category ON public.crm_email_templates(organization_id, category) WHERE is_active = true;

-- updated_at トリガー
CREATE TRIGGER set_crm_email_templates_updated_at
  BEFORE UPDATE ON public.crm_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_email_templates_org_isolation" ON public.crm_email_templates
  FOR ALL USING (
    organization_id = get_my_organization_id()
  );
