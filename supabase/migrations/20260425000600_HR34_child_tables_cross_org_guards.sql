-- HR-34 補強: 子テーブル (checklist_items / attachments / comments / reads) の
-- organization_id が親 task_items.organization_id と一致することをトリガで強制。
--
-- 既存の `20260425000100_HR34_task_items_cross_org_guards.sql` は task_items 自身
-- の parent_id と task_item_relations のみカバー。子テーブルでは RLS の WITH
-- CHECK が NEW.organization_id しか見ないため、
-- 「攻撃者が自組織の organization_id + 他組織の task_id を渡す」INSERT を
-- 構造的に防げていなかった。SECURITY DEFINER トリガで両者を比較する。

BEGIN;

-- =============================================================================
-- 0. 事前検証: 既存データに drift があれば停止する。
-- =============================================================================
-- トリガは新規 INSERT/UPDATE のみブロックするため、既に違反データがある場合は
-- defense-in-depth が成立しない。冪等な検証で本番デプロイ前に必ず気付ける。
DO $$
DECLARE
  v_drift integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_drift FROM (
    SELECT 1 FROM public.task_item_checklist_items c
      JOIN public.task_items t ON t.id = c.task_id
     WHERE c.organization_id <> t.organization_id
    UNION ALL
    SELECT 1 FROM public.task_item_attachments a
      JOIN public.task_items t ON t.id = a.task_id
     WHERE a.organization_id <> t.organization_id
    UNION ALL
    SELECT 1 FROM public.task_item_comments cm
      JOIN public.task_items t ON t.id = cm.task_id
     WHERE cm.organization_id <> t.organization_id
    UNION ALL
    SELECT 1 FROM public.task_item_reads r
      JOIN public.task_items t ON t.id = r.task_id
     WHERE r.organization_id <> t.organization_id
  ) AS s;
  IF v_drift > 0 THEN
    RAISE EXCEPTION 'HR34: % rows in task_item child tables have org_id mismatch with parent task_items. Resolve drift before applying this migration.', v_drift;
  END IF;
END $$;

-- =============================================================================
-- 1. 共通トリガ関数
-- =============================================================================
-- task_id を引いて親 task_items.organization_id を取り、NEW.organization_id と
-- 一致するか検証。SECURITY DEFINER で RLS を bypass し、他組織の task_id でも
-- 親 organization_id を読み取って比較できるようにする。
CREATE OR REPLACE FUNCTION public.task_items_child_check_same_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_org text;
BEGIN
  SELECT organization_id INTO v_parent_org
    FROM public.task_items
   WHERE id = NEW.task_id;
  IF v_parent_org IS NULL THEN
    RAISE EXCEPTION 'task_items child: parent task_id (%) does not exist', NEW.task_id;
  END IF;
  IF v_parent_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'task_items child: organization_id mismatch with parent task (parent=%, given=%)',
      v_parent_org, NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.task_items_child_check_same_org() OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.task_items_child_check_same_org() FROM PUBLIC;

-- =============================================================================
-- 2. 4 子テーブルにトリガを適用
-- =============================================================================
-- BEFORE INSERT OR UPDATE OF (task_id, organization_id) で発火。
-- task_id / organization_id 以外の列の UPDATE では発火させず、無駄な検証を避ける。

DROP TRIGGER IF EXISTS task_item_checklist_items_check_same_org_biu
  ON public.task_item_checklist_items;
CREATE TRIGGER task_item_checklist_items_check_same_org_biu
  BEFORE INSERT OR UPDATE OF task_id, organization_id
  ON public.task_item_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.task_items_child_check_same_org();

DROP TRIGGER IF EXISTS task_item_attachments_check_same_org_biu
  ON public.task_item_attachments;
CREATE TRIGGER task_item_attachments_check_same_org_biu
  BEFORE INSERT OR UPDATE OF task_id, organization_id
  ON public.task_item_attachments
  FOR EACH ROW EXECUTE FUNCTION public.task_items_child_check_same_org();

DROP TRIGGER IF EXISTS task_item_comments_check_same_org_biu
  ON public.task_item_comments;
CREATE TRIGGER task_item_comments_check_same_org_biu
  BEFORE INSERT OR UPDATE OF task_id, organization_id
  ON public.task_item_comments
  FOR EACH ROW EXECUTE FUNCTION public.task_items_child_check_same_org();

DROP TRIGGER IF EXISTS task_item_reads_check_same_org_biu
  ON public.task_item_reads;
CREATE TRIGGER task_item_reads_check_same_org_biu
  BEFORE INSERT OR UPDATE OF task_id, organization_id
  ON public.task_item_reads
  FOR EACH ROW EXECUTE FUNCTION public.task_items_child_check_same_org();

COMMIT;
