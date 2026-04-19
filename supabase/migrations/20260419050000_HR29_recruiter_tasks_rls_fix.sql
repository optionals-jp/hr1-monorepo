-- ============================================================================
-- HR-29 follow-up: recruiter_tasks の SELECT RLS を _require_recruiter_task_manager
-- と同じロール集合で揃える。admin / manager / approver が自分で作成したタスクを
-- 一覧で見られなかった不具合の修正。
-- ============================================================================

DROP POLICY IF EXISTS recruiter_tasks_select_org ON public.recruiter_tasks;

CREATE POLICY recruiter_tasks_select_org ON public.recruiter_tasks
  FOR SELECT USING (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND public.get_my_role() IN ('employee', 'admin', 'manager', 'approver')
  );
