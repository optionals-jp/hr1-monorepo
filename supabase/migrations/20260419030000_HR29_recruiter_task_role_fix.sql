-- ============================================================================
-- HR-29 follow-up: _require_recruiter_task_manager のロールチェックを
-- hr1-employee-web middleware の allowedRoles と揃える。
--
-- 従来: role='employee' のみ許可 → admin/manager/approver が 42501 forbidden
-- 修正: role IN ('employee', 'admin', 'manager', 'approver')
-- ============================================================================

CREATE OR REPLACE FUNCTION public._require_recruiter_task_manager(p_organization_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.get_my_role() IN ('employee', 'admin', 'manager', 'approver')
    AND EXISTS (
      SELECT 1 FROM public.get_my_organization_ids() AS org_id
      WHERE org_id = p_organization_id
    )
  ) THEN
    RAISE EXCEPTION 'forbidden: recruiter task manager role required for organization %', p_organization_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;
