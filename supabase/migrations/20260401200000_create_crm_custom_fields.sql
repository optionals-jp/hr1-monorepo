-- CRMカスタムフィールド: テナント毎に企業・連絡先・商談に独自フィールドを追加
-- Phase 2 Step 2

-- フィールド定義テーブル
CREATE TABLE IF NOT EXISTS public.crm_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'contact', 'deal')),
  field_type text NOT NULL,
  label text NOT NULL,
  description text,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  options text[],
  field_group text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_field_definitions_org_entity
  ON public.crm_field_definitions(organization_id, entity_type);

-- フィールド値テーブル
CREATE TABLE IF NOT EXISTS public.crm_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.crm_field_definitions(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'contact', 'deal')),
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_field_values_entity
  ON public.crm_field_values(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_crm_field_values_field
  ON public.crm_field_values(field_id);

-- RLS ポリシー
ALTER TABLE public.crm_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_field_definitions_org_isolation ON public.crm_field_definitions
  USING (organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY crm_field_values_org_isolation ON public.crm_field_values
  USING (organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1));

COMMENT ON TABLE public.crm_field_definitions IS 'テナント毎のCRMカスタムフィールド定義';
COMMENT ON TABLE public.crm_field_values IS 'CRMカスタムフィールドの値';
COMMENT ON COLUMN public.crm_field_definitions.entity_type IS '対象エンティティ: company/contact/deal';
COMMENT ON COLUMN public.crm_field_definitions.field_type IS 'フィールド型: text/number/currency/date/dropdown/multi_select/checkbox/url/email/phone';
COMMENT ON COLUMN public.crm_field_definitions.options IS '選択肢型のオプション配列';
COMMENT ON COLUMN public.crm_field_definitions.field_group IS 'フィールドグループ名（UI上のセクション分け用）';
