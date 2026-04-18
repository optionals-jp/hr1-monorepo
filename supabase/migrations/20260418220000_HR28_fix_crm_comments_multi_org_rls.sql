-- HR-28: crm_comments RLS を複数組織対応に修正
--
-- 背景:
--   20260413001800_crm_enhancements.sql で作成された crm_comments の RLS 4本
--   (select/insert/update/delete) は、非推奨ヘルパー public.get_my_organization_id()
--   (単数形, LIMIT 1) を使用している。複数組織所属ユーザーは、所属組織のうちの
--   1 組織分のコメントしか見えない/書き込めず、機能的に破綻する。
--
-- 修正方針:
--   organization_id IN (SELECT public.get_my_organization_ids()) に統一。
--   get_my_organization_ids() は CLAUDE.md で統一ヘルパーとして規定済み。
--
-- 影響範囲:
--   crm_comments の RLS のみ。DDL 変更なし。他テーブルポリシーは follow-up PR。
--
-- ロールバック:
--   DROP POLICY crm_comments_{select,insert,update,delete} ON crm_comments;
--   CREATE POLICY ... USING (organization_id = public.get_my_organization_id()); を復元。

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_select' AND tablename = 'crm_comments') THEN
    DROP POLICY crm_comments_select ON crm_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_insert' AND tablename = 'crm_comments') THEN
    DROP POLICY crm_comments_insert ON crm_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_update' AND tablename = 'crm_comments') THEN
    DROP POLICY crm_comments_update ON crm_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_delete' AND tablename = 'crm_comments') THEN
    DROP POLICY crm_comments_delete ON crm_comments;
  END IF;
END $$;

CREATE POLICY crm_comments_select ON crm_comments
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY crm_comments_insert ON crm_comments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY crm_comments_update ON crm_comments
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY crm_comments_delete ON crm_comments
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));
