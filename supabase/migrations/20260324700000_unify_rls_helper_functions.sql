-- ========================================================================
-- 全adminポリシーをget_my_role()/get_my_organization_ids()ヘルパーに統一
-- profiles/user_organizations以外のテーブルでもdirect_joinを廃止し
-- SECURITY DEFINERヘルパー経由に統一することで一貫性とパフォーマンスを改善
-- ========================================================================

-- jobs
DROP POLICY IF EXISTS "jobs_all_admin" ON public.jobs;
CREATE POLICY "jobs_all_admin" ON public.jobs FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS "jobs_select_org" ON public.jobs;
CREATE POLICY "jobs_select_org" ON public.jobs FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- departments
DROP POLICY IF EXISTS "departments_all_admin" ON public.departments;
CREATE POLICY "departments_all_admin" ON public.departments FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS "departments_select_org" ON public.departments;
CREATE POLICY "departments_select_org" ON public.departments FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- tasks
DROP POLICY IF EXISTS "tasks_all_admin" ON public.tasks;
CREATE POLICY "tasks_all_admin" ON public.tasks FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS "tasks_select_org" ON public.tasks;
CREATE POLICY "tasks_select_org" ON public.tasks FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- applications
DROP POLICY IF EXISTS "applications_all_admin" ON public.applications;
CREATE POLICY "applications_all_admin" ON public.applications FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

-- message_threads
DROP POLICY IF EXISTS "threads_all_admin" ON public.message_threads;
CREATE POLICY "threads_all_admin" ON public.message_threads FOR ALL
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS "threads_select" ON public.message_threads;
CREATE POLICY "threads_select" ON public.message_threads FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()) OR participant_id = auth.uid()::text);

-- messages
DROP POLICY IF EXISTS "messages_select_thread_member" ON public.messages;
CREATE POLICY "messages_select_thread_member" ON public.messages FOR SELECT
  USING (thread_id IN (
    SELECT id FROM public.message_threads
    WHERE organization_id IN (SELECT public.get_my_organization_ids()) OR participant_id = auth.uid()::text
  ));

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE
  USING (sender_id = auth.uid()::text);

-- audit_logs
DROP POLICY IF EXISTS "管理者が監査ログを閲覧" ON public.audit_logs;
CREATE POLICY "管理者が監査ログを閲覧" ON public.audit_logs FOR SELECT
  USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
