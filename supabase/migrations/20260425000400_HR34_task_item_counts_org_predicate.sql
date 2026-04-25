-- HR-34 follow-up: task_item_counts に organization_id の明示述語を追加。
-- RLS の qual は subquery 化で `idx_task_items_active_due` の leading column
-- に push down できず seq scan に落ちることがある。明示述語で確実に index
-- 走査させる。

BEGIN;

CREATE OR REPLACE FUNCTION public.task_item_counts(p_source text DEFAULT NULL)
RETURNS TABLE (
  active integer,
  done integer,
  overdue integer,
  today_count integer
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status <> 'done')::int AS active,
    COUNT(*) FILTER (WHERE status = 'done')::int AS done,
    COUNT(*) FILTER (
      WHERE status <> 'done' AND due IS NOT NULL AND due < CURRENT_DATE
    )::int AS overdue,
    COUNT(*) FILTER (
      WHERE status <> 'done' AND due = CURRENT_DATE
    )::int AS today_count
  FROM public.task_items
  WHERE organization_id IN (SELECT public.get_my_organization_ids())
    AND (p_source IS NULL OR source = p_source);
$$;

COMMIT;
