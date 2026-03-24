-- get_my_organization_ids を SECURITY DEFINER に変更
-- user_organizations の RLS ポリシーから呼ばれるため、RLS をバイパスしないと無限再帰になる
CREATE OR REPLACE FUNCTION public.get_my_organization_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text;
$$;

-- 同じ組織のメンバーの user_organizations を閲覧可能にするポリシー
-- 社員名簿・社員検索で必要
CREATE POLICY user_org_select_same_org ON public.user_organizations
  FOR SELECT
  USING (
    organization_id IN (SELECT get_my_organization_ids())
  );
