-- HR-34 follow-up: task_item_counts に担当者フィルタを追加 + 担当者向け index。
-- PostgreSQL は引数シグネチャでルーティングするため、新引数追加時は
-- `CREATE OR REPLACE` だけでは上書きできない（DROP→CREATE が必要）。

BEGIN;

DROP FUNCTION IF EXISTS public.task_item_counts(text);

CREATE OR REPLACE FUNCTION public.task_item_counts(
  p_source text DEFAULT NULL,
  p_assignees text[] DEFAULT NULL
)
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
    AND (p_source IS NULL OR source = p_source)
    AND (
      p_assignees IS NULL
      OR cardinality(p_assignees) = 0
      OR assignee_id = ANY(p_assignees)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.task_item_counts(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.task_item_counts(text, text[]) TO authenticated;

-- 一覧クエリ `WHERE org=? AND assignee_id IN (...) AND status = ?` 用。
-- assignee_id が NULL の行は ANY では常に false なので partial で絞る。
CREATE INDEX IF NOT EXISTS idx_task_items_org_assignee_status
  ON public.task_items (organization_id, assignee_id, status, due)
  WHERE assignee_id IS NOT NULL;

-- COMMIT 後数十秒、PostgREST が旧シグネチャを参照し PGRST202 を返すのを防ぐ。
NOTIFY pgrst, 'reload schema';

COMMIT;
