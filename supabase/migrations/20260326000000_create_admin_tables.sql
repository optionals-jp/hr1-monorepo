-- ========================================================================
-- HR1管理サイト用テーブル
--
-- HR1社員が契約企業・プラン・契約情報を管理するためのテーブルを作成する。
-- profiles.role に 'hr1_admin' を追加し、管理サイト専用のアクセス制御を行う。
-- ========================================================================

-- ========================================================================
-- 1. profiles の role CHECK制約を更新（hr1_admin を追加）
-- ========================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'employee', 'applicant', 'hr1_admin'));

-- ========================================================================
-- 2. plans テーブル（プラン定義）
-- ========================================================================

CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  max_employees INTEGER,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- hr1_admin のみ全操作可能
CREATE POLICY "plans_all_hr1_admin" ON public.plans FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ========================================================================
-- 3. contracts テーブル（契約情報）
-- ========================================================================

CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  contracted_employees INTEGER NOT NULL,
  monthly_price INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  trial_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- hr1_admin のみ全操作可能
CREATE POLICY "contracts_all_hr1_admin" ON public.contracts FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ========================================================================
-- 4. contract_changes テーブル（契約変更履歴）
-- ========================================================================

CREATE TABLE public.contract_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL
    CHECK (change_type IN ('created', 'plan_changed', 'employees_changed', 'suspended', 'cancelled', 'renewed', 'updated')),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contract_changes ENABLE ROW LEVEL SECURITY;

-- hr1_admin のみ全操作可能
CREATE POLICY "contract_changes_all_hr1_admin" ON public.contract_changes FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ========================================================================
-- 5. hr1_admin 用の profiles RLSポリシー
-- ========================================================================

-- hr1_admin は自分自身のプロフィールを参照可能
CREATE POLICY "profiles_select_hr1_admin_self" ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'hr1_admin' AND id = auth.uid());

-- hr1_admin は全組織を参照可能（管理画面用）
CREATE POLICY "organizations_select_hr1_admin" ON public.organizations FOR SELECT
  USING (public.get_my_role() = 'hr1_admin');

-- hr1_admin は user_organizations を参照可能（社員数カウント用）
CREATE POLICY "user_organizations_select_hr1_admin" ON public.user_organizations FOR SELECT
  USING (public.get_my_role() = 'hr1_admin');

-- ========================================================================
-- 6. インデックス
-- ========================================================================

CREATE INDEX idx_contracts_organization_id ON public.contracts(organization_id);
CREATE INDEX idx_contracts_plan_id ON public.contracts(plan_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contract_changes_contract_id ON public.contract_changes(contract_id);
