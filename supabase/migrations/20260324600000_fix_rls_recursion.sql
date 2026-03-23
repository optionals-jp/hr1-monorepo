-- ========================================================================
-- RLS無限再帰の修正
--
-- profiles と user_organizations の間でRLSポリシーが相互参照し、
-- 無限再帰が発生していた問題を修正する。
--
-- 解決策: SECURITY DEFINER ヘルパー関数を作成し、RLSを迂回して
-- profiles.role と user_organizations.organization_id を取得する。
-- ========================================================================

-- get_my_role() と get_my_organization_ids() は 20260324300000_review_fixes.sql で定義済み
-- この migration はポリシーの修正のみ行う

-- ========================================================================
-- 1. profiles テーブルの再帰ポリシーを修正
-- ========================================================================

-- profiles_all_admin: profiles自身を参照していた → get_my_role() を使用
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
CREATE POLICY "profiles_all_admin" ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- profiles_select_org_member: user_organizations を直接参照していた → get_my_organization_ids() を使用
DROP POLICY IF EXISTS "profiles_select_org_member" ON public.profiles;
CREATE POLICY "profiles_select_org_member" ON public.profiles FOR SELECT
  USING (id IN (
    SELECT uo.user_id FROM public.user_organizations uo
    WHERE uo.organization_id IN (SELECT public.get_my_organization_ids())
  ));

-- ========================================================================
-- 2. user_organizations テーブルの再帰ポリシーを修正
-- ========================================================================

-- user_org_all_admin: profiles JOIN user_organizations を参照していた → get_my_role() を使用
DROP POLICY IF EXISTS "user_org_all_admin" ON public.user_organizations;
CREATE POLICY "user_org_all_admin" ON public.user_organizations FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- user_org_select_org_member: user_organizations自身を参照していた（削除）
-- user_org_select_own が同等の役割を果たすため不要
DROP POLICY IF EXISTS "user_org_select_org_member" ON public.user_organizations;

-- ========================================================================
-- 3. 削除対象のポリシー（再帰を引き起こしていた）
-- ========================================================================

-- authenticated_read_user_organizations: user_org_ids() 関数経由で
-- user_organizations を再帰参照していた
DROP POLICY IF EXISTS "authenticated_read_user_organizations" ON public.user_organizations;
