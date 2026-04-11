-- ========================================================================
-- 廃止ヘルパー user_org_ids() を削除
--
-- 全ての参照ポリシーは get_my_organization_ids() / get_my_organization_id()
-- に移行済み (20260413000100 / 20260413000200 のクリーンアップ)。
--
-- 今後は以下のヘルパーを使用すること:
--   * get_my_organization_ids() : SETOF text (複数組織所属対応)
--   * get_my_organization_id()  : text (単一組織を返す。マルチ組織非対応)
--   * get_my_role()              : text (auth.uid() のロール)
-- ========================================================================

DROP FUNCTION IF EXISTS public.user_org_ids();
