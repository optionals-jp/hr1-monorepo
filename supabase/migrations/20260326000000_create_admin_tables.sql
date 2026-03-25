-- =============================================================================
-- HR1 Admin 用テーブル作成
--
-- plans, contracts, contract_changes テーブルと hr1_admin 用 RLS ポリシー
-- 注意: profiles の RLS ポリシーは get_my_role() ヘルパーを使い再帰を防止する
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles の role CHECK 制約を更新（hr1_admin を追加）
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'employee', 'applicant', 'hr1_admin'));

-- ---------------------------------------------------------------------------
-- 2. plans（料金プラン）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly integer NOT NULL DEFAULT 0,
  max_employees integer,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_all_hr1_admin" ON public.plans FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ---------------------------------------------------------------------------
-- 3. contracts（契約）
--    organization_id は text 型（organizations.id が text）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  contracted_employees integer NOT NULL DEFAULT 0,
  monthly_price integer NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  trial_end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_all_hr1_admin" ON public.contracts FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ---------------------------------------------------------------------------
-- 4. contract_changes（契約変更履歴）
--    changed_by は profiles.id (text) を参照
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contract_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  changed_by text REFERENCES public.profiles(id),
  change_type text NOT NULL
    CHECK (change_type IN ('created', 'plan_changed', 'employees_changed', 'suspended', 'cancelled', 'renewed', 'updated')),
  old_values jsonb,
  new_values jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_changes_all_hr1_admin" ON public.contract_changes FOR ALL
  USING (public.get_my_role() = 'hr1_admin')
  WITH CHECK (public.get_my_role() = 'hr1_admin');

-- ---------------------------------------------------------------------------
-- 5. hr1_admin 用の既存テーブル RLS ポリシー
--    全て get_my_role() を使用（profiles への再帰参照を防止）
-- ---------------------------------------------------------------------------

-- hr1_admin は全組織を参照可能（管理画面用）
CREATE POLICY "organizations_select_hr1_admin" ON public.organizations FOR SELECT
  USING (public.get_my_role() = 'hr1_admin');

-- hr1_admin は全プロフィールを参照可能（管理画面用）
-- ※ profiles_select_own が既に存在するので自分自身は読める
--   ここでは他ユーザーの参照用に追加
CREATE POLICY "profiles_select_hr1_admin" ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'hr1_admin');

-- hr1_admin は user_organizations を参照可能（社員数カウント用）
CREATE POLICY "user_organizations_select_hr1_admin" ON public.user_organizations FOR SELECT
  USING (public.get_my_role() = 'hr1_admin');

-- ---------------------------------------------------------------------------
-- 6. インデックス
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_plan_id ON public.contracts(plan_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_changes_contract_id ON public.contract_changes(contract_id);

-- ---------------------------------------------------------------------------
-- 7. 初期プランデータ
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (name, price_monthly, max_employees, description, features) VALUES
  ('Starter',  300, 20,   '20名以下の小規模チーム向け',
   ARRAY['勤怠管理', '社員名簿', 'お知らせ', 'FAQ']),
  ('Standard', 500, 80,   '80名以下の成長企業向け',
   ARRAY['Starterの全機能', 'ATS', '360度評価', 'ワークフロー', 'サーベイ']),
  ('Premium',  800, NULL, '大規模組織向け（人数制限なし）',
   ARRAY['Standardの全機能', '監査ログ', '法令ガイド', 'API連携', '優先サポート']);
