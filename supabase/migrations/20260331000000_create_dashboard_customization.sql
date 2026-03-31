-- ========================================================================
-- 採用目標テーブル + ダッシュボードウィジェット設定テーブル
-- ========================================================================

-- recruiting_targets: 採用目標（応募数・内定数）を採用区分×年度で管理
CREATE TABLE IF NOT EXISTS public.recruiting_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  hiring_type text NOT NULL CHECK (hiring_type IN ('new_grad', 'mid_career', 'all')),
  target_type text NOT NULL CHECK (target_type IN ('applications', 'offers')),
  target_value integer NOT NULL DEFAULT 0 CHECK (target_value >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, fiscal_year, hiring_type, target_type)
);

CREATE INDEX idx_recruiting_targets_org ON public.recruiting_targets(organization_id);
ALTER TABLE public.recruiting_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recruiting_targets_all_admin" ON public.recruiting_targets FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "recruiting_targets_select_org" ON public.recruiting_targets FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- dashboard_widget_preferences: ダッシュボードウィジェットの表示・並び順設定
CREATE TABLE IF NOT EXISTS public.dashboard_widget_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_tab text NOT NULL CHECK (product_tab IN ('recruiting', 'workspace', 'client')),
  widget_config jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(widget_config) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, product_tab)
);

ALTER TABLE public.dashboard_widget_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_widget_pref_own" ON public.dashboard_widget_preferences FOR ALL
  USING (user_id = auth.uid()::text AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (user_id = auth.uid()::text AND organization_id IN (SELECT public.get_my_organization_ids()));
