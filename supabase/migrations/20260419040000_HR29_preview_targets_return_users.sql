-- ============================================================================
-- HR-29 follow-up: preview_recruiter_task_targets を「人数」から
-- 「対象ユーザー一覧」を返す仕様に変更する。UI 側で名前・メールを確認してから
-- タスクを作成できるようにするのが目的。
-- ============================================================================

DROP FUNCTION IF EXISTS public.preview_recruiter_task_targets(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.preview_recruiter_task_targets(
  p_organization_id text,
  p_target_mode text,
  p_target_criteria jsonb
)
RETURNS TABLE (
  user_id text,
  display_name text,
  email text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- resolve_recruiter_task_targets 内部で _require_recruiter_task_manager が呼ばれるため
  -- ここでの再チェックは不要（二重呼び出しは副作用なし）。
  RETURN QUERY
  SELECT p.id AS user_id, p.display_name, p.email, p.avatar_url
    FROM public.resolve_recruiter_task_targets(p_organization_id, p_target_mode, p_target_criteria) AS t(applicant_id)
    JOIN public.profiles p ON p.id = t.applicant_id
    ORDER BY p.display_name NULLS LAST, p.email;
END;
$$;

ALTER FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_recruiter_task_targets(text, text, jsonb) TO authenticated, service_role;
