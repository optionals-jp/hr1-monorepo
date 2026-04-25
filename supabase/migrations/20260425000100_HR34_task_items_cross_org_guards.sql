-- HR-34 補強: 組織横断の parent_id / relation を構造的に拒否する。
--
-- 親 task_items が別組織にあるケースを BEFORE トリガで弾く。
-- task_items_check_no_cycle の SELECT は SECURITY INVOKER + RLS で他組織の親が
-- NULL になるため循環検知をすり抜ける。組織横断 parent_id を構造的に許さない
-- ため、SECURITY DEFINER で組織を比較する。
CREATE OR REPLACE FUNCTION public.task_items_check_parent_same_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_org text;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT organization_id INTO parent_org FROM public.task_items WHERE id = NEW.parent_id;
  IF parent_org IS NULL THEN
    RAISE EXCEPTION 'task_items: parent_id (%) does not exist', NEW.parent_id;
  END IF;
  IF parent_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'task_items: parent_id (%) belongs to a different organization', NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_items_check_parent_same_org_biud ON public.task_items;
CREATE TRIGGER task_items_check_parent_same_org_biud
  BEFORE INSERT OR UPDATE OF parent_id, organization_id ON public.task_items
  FOR EACH ROW EXECUTE FUNCTION public.task_items_check_parent_same_org();

-- task_item_relations の task_id / related_task_id が同じ organization_id か検証。
-- RLS WITH CHECK だけでは task_id 側のみ検証されるため、SECURITY DEFINER で
-- 両側の organization を比較する。
CREATE OR REPLACE FUNCTION public.task_item_relations_check_same_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_org text;
  related_org text;
BEGIN
  SELECT organization_id INTO task_org FROM public.task_items WHERE id = NEW.task_id;
  SELECT organization_id INTO related_org FROM public.task_items WHERE id = NEW.related_task_id;
  IF task_org IS NULL OR related_org IS NULL THEN
    RAISE EXCEPTION 'task_item_relations: referenced task_items not found';
  END IF;
  IF task_org <> related_org OR task_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'task_item_relations: task and related_task must share organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_item_relations_check_same_org_biu ON public.task_item_relations;
CREATE TRIGGER task_item_relations_check_same_org_biu
  BEFORE INSERT OR UPDATE ON public.task_item_relations
  FOR EACH ROW EXECUTE FUNCTION public.task_item_relations_check_same_org();
