-- HR-34: タスク一覧 KPI カウントを 1 RTT で返す RPC + active 行 partial index。
-- クライアント側で全件 SCAN している現行の O(n) を排除し、org あたり 10K を
-- 超えてもスケールさせる。

BEGIN;

-- active / overdue / today count はすべて `status <> 'done'`。partial index で
-- 対象行を直接覆い、index-only scan を可能にする。
CREATE INDEX IF NOT EXISTS idx_task_items_active_due
  ON public.task_items (organization_id, due)
  WHERE status <> 'done';

DROP FUNCTION IF EXISTS public.task_item_counts(text);

CREATE OR REPLACE FUNCTION public.task_item_counts(p_source text DEFAULT NULL)
RETURNS TABLE (
  active integer,
  done integer,
  overdue integer,
  today_count integer
)
LANGUAGE sql
-- task_items の RLS が呼出ユーザに評価され、クロス組織集計は構造的に発生しない。
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
  WHERE (p_source IS NULL OR source = p_source)
$$;

REVOKE EXECUTE ON FUNCTION public.task_item_counts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.task_item_counts(text) TO authenticated;

COMMIT;
