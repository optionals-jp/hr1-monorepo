-- ========================================================================
-- 重複・古い・セキュリティホールのある RLS ポリシーを一括削除
--
-- 背景: 83 本の旧マイグレーションを 20260413 baseline に集約した後、
-- 新旧ポリシーの併存で以下の問題が判明:
--
-- 1. qual=true のポリシー: 実質全公開。CRITICAL なセキュリティホール
-- 2. 旧ヘルパー user_org_ids() に依存する authenticated_* ポリシー:
--    新しい get_my_organization_ids() に統一するため削除
-- 3. 「Users can X...」英文ポリシーと `<table>_<action>` の機能重複
-- 4. 日本語名ポリシーと英名ポリシーの機能重複
--
-- 方針:
--   - 重複していても機能的に別軸 (admin/self/hr1_admin/manager 等) は保持
--   - qual=true は即削除
--   - authenticated_* は削除し、必要なら get_my_organization_ids() 系を残す
--   - 同一機能の古い別名 (「Users can X」「日本語名」) は削除
-- ========================================================================

-- ======== 1. qual=true (完全公開) のセキュリティホールを全削除 ========
DROP POLICY IF EXISTS "authenticated_write_application_steps" ON public.application_steps;
DROP POLICY IF EXISTS "authenticated_read_application_steps" ON public.application_steps;
DROP POLICY IF EXISTS "authenticated_read_anchors" ON public.evaluation_anchors;
DROP POLICY IF EXISTS "authenticated_all_job_steps" ON public.job_steps;
DROP POLICY IF EXISTS "authenticated_write_jobs" ON public.jobs;
DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "project_team_members_select" ON public.project_team_members;
DROP POLICY IF EXISTS "project_teams_select" ON public.project_teams;
DROP POLICY IF EXISTS "projects_select" ON public.projects;

-- ======== 2. 旧ヘルパー user_org_ids() 依存の authenticated_* を削除 ========
DROP POLICY IF EXISTS "authenticated_insert_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_read_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_update_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_read_custom_forms" ON public.custom_forms;
DROP POLICY IF EXISTS "authenticated_read_departments" ON public.departments;
DROP POLICY IF EXISTS "authenticated_read_employee_departments" ON public.employee_departments;
DROP POLICY IF EXISTS "authenticated_read_evaluation_criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_read_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_write_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_read_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_update_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_insert_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_read_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_update_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_read_form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "authenticated_read_form_responses" ON public.form_responses;
DROP POLICY IF EXISTS "authenticated_write_form_responses" ON public.form_responses;
DROP POLICY IF EXISTS "authenticated_read_interview_slots" ON public.interview_slots;
DROP POLICY IF EXISTS "authenticated_read_interviews" ON public.interviews;
DROP POLICY IF EXISTS "authenticated_read_job_sections" ON public.job_sections;
DROP POLICY IF EXISTS "authenticated_read_jobs" ON public.jobs;
DROP POLICY IF EXISTS "authenticated_read_organizations" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_update_own" ON public.profiles;

-- org_manage_* / org_read_* 系 (authenticated_* と同じく user_org_ids 依存)
DROP POLICY IF EXISTS "org_manage_anchors" ON public.evaluation_anchors;
DROP POLICY IF EXISTS "org_manage_assignments" ON public.evaluation_assignments;
DROP POLICY IF EXISTS "org_read_assignments" ON public.evaluation_assignments;
DROP POLICY IF EXISTS "org_manage_cycles" ON public.evaluation_cycles;
DROP POLICY IF EXISTS "org_read_cycles" ON public.evaluation_cycles;

-- ======== 3. "Users can X..." 英文ポリシー (新スタイルと機能重複) ========
DROP POLICY IF EXISTS "Users can delete steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can create steps for own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can view steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can update steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can delete own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can create own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can view own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can update own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can send messages to accessible threads" ON public.messages;

-- ======== 4. 日本語名の機能重複ポリシー (英名に統一) ========
DROP POLICY IF EXISTS "同一組織メンバーがフォームを閲覧" ON public.custom_forms;
DROP POLICY IF EXISTS "フォームフィールドを閲覧" ON public.form_fields;
DROP POLICY IF EXISTS "管理者は組織内の申請を閲覧" ON public.workflow_requests;
DROP POLICY IF EXISTS "管理者は組織内の申請を更新" ON public.workflow_requests;

-- ======== 5. 古い重複 (approvers_* / corrections_* / attendance_*_own 等) ========
DROP POLICY IF EXISTS "approvers_admin_all" ON public.attendance_approvers;
DROP POLICY IF EXISTS "approvers_employee_read" ON public.attendance_approvers;
DROP POLICY IF EXISTS "corrections_admin_all" ON public.attendance_corrections;
DROP POLICY IF EXISTS "corrections_own_all" ON public.attendance_corrections;
DROP POLICY IF EXISTS "corrections_approver_read" ON public.attendance_corrections;
DROP POLICY IF EXISTS "corrections_approver_update" ON public.attendance_corrections;
DROP POLICY IF EXISTS "attendance_punches_own" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_punches_org_read" ON public.attendance_punches;
DROP POLICY IF EXISTS "attendance_records_own" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_org_read" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_settings_manage" ON public.attendance_settings;
-- attendance_settings_select と attendance_settings_select_org は qual が同一なので片方削除
DROP POLICY IF EXISTS "attendance_settings_select" ON public.attendance_settings;

-- task_assignees_access (FOR ALL, 全組織メンバーに全権限) は広すぎ。
-- admin 専用の all + 本人参照の select + org 閲覧の select に絞る
DROP POLICY IF EXISTS "task_assignees_access" ON public.task_assignees;

-- tasks_org_access (FOR ALL, 全組織メンバーに全権限) も同様に広すぎ。
-- tasks_all_admin を残し、org 閲覧用の SELECT ポリシーを別途追加
DROP POLICY IF EXISTS "tasks_org_access" ON public.tasks;

-- ======== 6. 削除で欠けた coverage を補完するポリシー追加 ========

-- application_steps: qual=true を落としたので、応募者 (本人) と組織管理者のみに絞る
-- 既存の app_steps_all_admin (admin) / app_steps_select_own (applicant) で足りている

-- jobs: SELECT は jobs_select_org (org 全員) + public_read_open_jobs (anon) で足る
-- ALL は jobs_all_admin (admin のみ) で足る

-- job_sections: SELECT は public_read_open_job_sections (anon) のみでは組織員が読めない
CREATE POLICY "job_sections_select_org" ON public.job_sections FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- job_steps: SELECT が qual=true 削除で失われるので組織員読み取りを追加
CREATE POLICY "job_steps_select_org" ON public.job_steps FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- tasks: tasks_org_access を落としたので org 閲覧 SELECT を追加
CREATE POLICY "tasks_select_org" ON public.tasks FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- tasks: 組織メンバーが自分で新規作成・自分のものを更新できるポリシー追加
CREATE POLICY "tasks_insert_org_member" ON public.tasks FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND created_by = (auth.uid())::text
  );

CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE
  USING (
    created_by = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- task_assignees: task_assignees_access を落としたので org 操作用を追加
-- (task_assignees_all_admin は既にあるので admin は足りる)
-- アサイン本人が自分のアサインを更新できる
CREATE POLICY "task_assignees_update_own" ON public.task_assignees FOR UPDATE
  USING (user_id = (auth.uid())::text);

-- project_teams / project_team_members / projects:
-- qual=true を落としたので組織員 SELECT を追加
CREATE POLICY "projects_select_org" ON public.projects FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "project_teams_select_org" ON public.project_teams FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

CREATE POLICY "project_team_members_select_org" ON public.project_team_members FOR SELECT
  USING (
    team_id IN (
      SELECT pt.id FROM public.project_teams pt
      JOIN public.projects pr ON pr.id = pt.project_id
      WHERE pr.organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- 管理者が project / project_teams / project_team_members を管理
CREATE POLICY "projects_all_admin" ON public.projects FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "project_teams_all_admin" ON public.project_teams FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND project_id IN (
      SELECT id FROM public.projects
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

CREATE POLICY "project_team_members_all_admin" ON public.project_team_members FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND team_id IN (
      SELECT pt.id FROM public.project_teams pt
      JOIN public.projects pr ON pr.id = pt.project_id
      WHERE pr.organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND team_id IN (
      SELECT pt.id FROM public.project_teams pt
      JOIN public.projects pr ON pr.id = pt.project_id
      WHERE pr.organization_id IN (SELECT public.get_my_organization_ids())
    )
  );
