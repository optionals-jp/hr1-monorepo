-- ============================================================
-- 名刺管理 + CRM テーブル
-- ============================================================

-- ============================================================
-- 1. bc_companies（取引先企業）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_kana text,
  corporate_number text,
  postal_code text,
  address text,
  phone text,
  website text,
  industry text,
  notes text,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 法人番号の組織内ユニーク制約（NULLは許可）
CREATE UNIQUE INDEX IF NOT EXISTS idx_bc_companies_org_corp_num
  ON public.bc_companies(organization_id, corporate_number)
  WHERE corporate_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bc_companies_org ON public.bc_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_companies_name ON public.bc_companies(organization_id, name);

ALTER TABLE public.bc_companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_bc_companies_updated_at
  BEFORE UPDATE ON public.bc_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
DO $$ BEGIN
  CREATE POLICY "bc_companies_select_org" ON public.bc_companies FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_companies_insert_org" ON public.bc_companies FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_companies_update_org" ON public.bc_companies FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_companies_delete_admin" ON public.bc_companies FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. bc_contacts（名刺連絡先）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.bc_companies(id) ON DELETE SET NULL,
  last_name text NOT NULL,
  first_name text,
  last_name_kana text,
  first_name_kana text,
  department text,
  position text,
  email text,
  phone text,
  mobile_phone text,
  notes text,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- メールアドレスの組織内ユニーク制約（NULLは許可）
CREATE UNIQUE INDEX IF NOT EXISTS idx_bc_contacts_org_email
  ON public.bc_contacts(organization_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bc_contacts_org ON public.bc_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_contacts_company ON public.bc_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_bc_contacts_name ON public.bc_contacts(organization_id, last_name, first_name);

ALTER TABLE public.bc_contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_bc_contacts_updated_at
  BEFORE UPDATE ON public.bc_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE POLICY "bc_contacts_select_org" ON public.bc_contacts FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_contacts_insert_org" ON public.bc_contacts FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_contacts_update_org" ON public.bc_contacts FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_contacts_delete_admin" ON public.bc_contacts FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. bc_cards（名刺画像）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.bc_contacts(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  raw_text text,
  scanned_by text NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bc_cards_org ON public.bc_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_cards_contact ON public.bc_cards(contact_id);

ALTER TABLE public.bc_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "bc_cards_select_org" ON public.bc_cards FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_cards_insert_org" ON public.bc_cards FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_cards_update_org" ON public.bc_cards FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_cards_delete_admin" ON public.bc_cards FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. bc_deals（商談）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.bc_companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.bc_contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount bigint,
  status text NOT NULL DEFAULT 'open',
  stage text NOT NULL DEFAULT 'initial',
  expected_close_date date,
  description text,
  assigned_to text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bc_deals_org ON public.bc_deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_deals_company ON public.bc_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_bc_deals_contact ON public.bc_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_bc_deals_assigned ON public.bc_deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bc_deals_status ON public.bc_deals(organization_id, status);

ALTER TABLE public.bc_deals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_bc_deals_updated_at
  BEFORE UPDATE ON public.bc_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE POLICY "bc_deals_select_org" ON public.bc_deals FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_deals_insert_org" ON public.bc_deals FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_deals_update_org" ON public.bc_deals FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_deals_delete_admin" ON public.bc_deals FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. bc_activities（活動記録：アポ・メモ・電話・訪問等）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.bc_companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.bc_contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.bc_deals(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  activity_date timestamptz,
  created_by text NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bc_activities_org ON public.bc_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_activities_company ON public.bc_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_bc_activities_contact ON public.bc_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_bc_activities_deal ON public.bc_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_bc_activities_type ON public.bc_activities(organization_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_bc_activities_date ON public.bc_activities(organization_id, activity_date DESC);

ALTER TABLE public.bc_activities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_bc_activities_updated_at
  BEFORE UPDATE ON public.bc_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE POLICY "bc_activities_select_org" ON public.bc_activities FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_activities_insert_org" ON public.bc_activities FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_activities_update_org" ON public.bc_activities FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_activities_delete_admin" ON public.bc_activities FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 6. bc_todos（CRM TODO）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bc_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.bc_companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.bc_contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.bc_deals(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  assigned_to text NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bc_todos_org ON public.bc_todos(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_todos_assigned ON public.bc_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bc_todos_assigned_incomplete
  ON public.bc_todos(assigned_to, due_date)
  WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_bc_todos_company ON public.bc_todos(company_id);
CREATE INDEX IF NOT EXISTS idx_bc_todos_contact ON public.bc_todos(contact_id);
CREATE INDEX IF NOT EXISTS idx_bc_todos_deal ON public.bc_todos(deal_id);

ALTER TABLE public.bc_todos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_bc_todos_updated_at
  BEFORE UPDATE ON public.bc_todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  CREATE POLICY "bc_todos_select_org" ON public.bc_todos FOR SELECT
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_todos_insert_org" ON public.bc_todos FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_todos_update_org" ON public.bc_todos FOR UPDATE
    USING (organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_todos_delete_admin" ON public.bc_todos FOR DELETE
    USING (
      public.get_my_role() = 'admin'
      AND organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 7. Storage: business-cards バケット
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-cards', 'business-cards', false)
ON CONFLICT (id) DO NOTHING;

-- 同一組織メンバーのみアクセス可能
DO $$ BEGIN
  CREATE POLICY "bc_storage_select" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'business-cards'
      AND (storage.foldername(name))[1] IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_storage_insert" ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'business-cards'
      AND (storage.foldername(name))[1] IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bc_storage_delete" ON storage.objects FOR DELETE
    USING (
      bucket_id = 'business-cards'
      AND (storage.foldername(name))[1] IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
