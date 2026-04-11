-- ========================================================================
-- 重複・古い・セキュリティホールのある RLS ポリシーを一括削除
--
-- 背景: 旧マイグレーション 83 本を 20260413000000_baseline に集約した後、
-- Supabase Studio / 旧 helper (user_org_ids) / qual=true 等の混在を掃除。
--
-- 削除カテゴリ:
-- 1. qual=true のセキュリティホール (完全公開ポリシー)
-- 2. 旧ヘルパー user_org_ids() 依存の authenticated_* ポリシー
-- 3. 「Users can X...」英文ポリシー (新スタイルと機能重複)
-- 4. 日本語名のうち英名ポリシーと完全重複するもの
-- 5. approvers_* / corrections_* / attendance_*_own 等の旧重複
--
-- 方針:
-- * 新スタイル (*_select_org / *_all_admin / *_select_own) がある場合は旧を削除
-- * 新スタイルが無く旧ポリシーだけの場合は keep (カバレッジを壊さない)
-- * 不足カバレッジは後続の fix migration で追加
-- ========================================================================

-- ================================================================
-- 1. qual=true (完全公開) のセキュリティホール
-- ================================================================
DROP POLICY IF EXISTS "authenticated_write_application_steps" ON public.application_steps;
DROP POLICY IF EXISTS "authenticated_read_application_steps" ON public.application_steps;
DROP POLICY IF EXISTS "authenticated_read_anchors" ON public.evaluation_anchors;
DROP POLICY IF EXISTS "authenticated_all_job_steps" ON public.job_steps;
DROP POLICY IF EXISTS "authenticated_write_jobs" ON public.jobs;
DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "project_team_members_select" ON public.project_team_members;
DROP POLICY IF EXISTS "project_team_members_delete" ON public.project_team_members;
DROP POLICY IF EXISTS "project_team_members_update" ON public.project_team_members;
DROP POLICY IF EXISTS "project_teams_select" ON public.project_teams;
DROP POLICY IF EXISTS "project_teams_delete" ON public.project_teams;
DROP POLICY IF EXISTS "project_teams_update" ON public.project_teams;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
-- project_*_insert (WITH CHECK null) は INSERT で何も許可しない (実質無効)
DROP POLICY IF EXISTS "project_team_members_insert" ON public.project_team_members;
DROP POLICY IF EXISTS "project_teams_insert" ON public.project_teams;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;

-- ================================================================
-- 2. 旧ヘルパー user_org_ids() 依存の authenticated_* を全削除
-- ================================================================
-- applications
DROP POLICY IF EXISTS "authenticated_insert_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_read_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_update_applications" ON public.applications;

-- custom_forms (新: 管理者がフォームを管理 [ALL])
DROP POLICY IF EXISTS "authenticated_delete_custom_forms" ON public.custom_forms;
DROP POLICY IF EXISTS "authenticated_write_custom_forms" ON public.custom_forms;
DROP POLICY IF EXISTS "authenticated_read_custom_forms" ON public.custom_forms;
DROP POLICY IF EXISTS "authenticated_update_custom_forms" ON public.custom_forms;

-- departments
DROP POLICY IF EXISTS "authenticated_read_departments" ON public.departments;

-- employee_departments
DROP POLICY IF EXISTS "authenticated_read_employee_departments" ON public.employee_departments;

-- evaluation_criteria (新: eval_criteria_all_admin, eval_criteria_select_org)
DROP POLICY IF EXISTS "authenticated_delete_evaluation_criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_write_evaluation_criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_read_evaluation_criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "authenticated_update_evaluation_criteria" ON public.evaluation_criteria;

-- evaluation_scores (新: eval_scores_*)
DROP POLICY IF EXISTS "authenticated_delete_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_write_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_read_evaluation_scores" ON public.evaluation_scores;
DROP POLICY IF EXISTS "authenticated_update_evaluation_scores" ON public.evaluation_scores;

-- evaluation_templates (新: eval_templates_*)
DROP POLICY IF EXISTS "authenticated_delete_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_insert_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_read_evaluation_templates" ON public.evaluation_templates;
DROP POLICY IF EXISTS "authenticated_update_evaluation_templates" ON public.evaluation_templates;

-- evaluations (新: evaluations_*)
DROP POLICY IF EXISTS "authenticated_delete_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_insert_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_read_evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "authenticated_update_evaluations" ON public.evaluations;

-- form_fields (新: 管理者がフィールドを管理 [ALL])
DROP POLICY IF EXISTS "authenticated_delete_form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "authenticated_write_form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "authenticated_read_form_fields" ON public.form_fields;
DROP POLICY IF EXISTS "authenticated_update_form_fields" ON public.form_fields;

-- form_responses (新: 自分の回答を送信/閲覧, 管理者が回答を閲覧)
DROP POLICY IF EXISTS "authenticated_write_form_responses" ON public.form_responses;
DROP POLICY IF EXISTS "authenticated_read_form_responses" ON public.form_responses;
DROP POLICY IF EXISTS "authenticated_update_form_responses" ON public.form_responses;

-- interview_slots (新: interview_slots_*)
DROP POLICY IF EXISTS "authenticated_delete_interview_slots" ON public.interview_slots;
DROP POLICY IF EXISTS "authenticated_write_interview_slots" ON public.interview_slots;
DROP POLICY IF EXISTS "authenticated_read_interview_slots" ON public.interview_slots;
DROP POLICY IF EXISTS "authenticated_update_interview_slots" ON public.interview_slots;

-- interviews (新: interviews_*)
DROP POLICY IF EXISTS "authenticated_delete_interviews" ON public.interviews;
DROP POLICY IF EXISTS "authenticated_write_interviews" ON public.interviews;
DROP POLICY IF EXISTS "authenticated_read_interviews" ON public.interviews;
DROP POLICY IF EXISTS "authenticated_update_interviews" ON public.interviews;

-- job_sections (新: public_read_open_job_sections + 後で追加する job_sections_select_org)
DROP POLICY IF EXISTS "authenticated_delete_job_sections" ON public.job_sections;
DROP POLICY IF EXISTS "authenticated_write_job_sections" ON public.job_sections;
DROP POLICY IF EXISTS "authenticated_read_job_sections" ON public.job_sections;
DROP POLICY IF EXISTS "authenticated_update_job_sections" ON public.job_sections;

-- jobs (新: jobs_all_admin, jobs_select_org, public_read_open_jobs)
DROP POLICY IF EXISTS "authenticated_read_jobs" ON public.jobs;

-- organizations (新: org_select_member, organizations_select_hr1_admin)
DROP POLICY IF EXISTS "authenticated_read_organizations" ON public.organizations;

-- profiles (新: profiles_update_own)
DROP POLICY IF EXISTS "authenticated_update_own" ON public.profiles;

-- ================================================================
-- 3. org_manage_* / org_read_* (新 eval_*_all_admin / eval_*_select_org と重複)
-- ================================================================
DROP POLICY IF EXISTS "org_manage_anchors" ON public.evaluation_anchors;
DROP POLICY IF EXISTS "org_manage_assignments" ON public.evaluation_assignments;
DROP POLICY IF EXISTS "org_read_assignments" ON public.evaluation_assignments;
DROP POLICY IF EXISTS "org_manage_cycles" ON public.evaluation_cycles;
DROP POLICY IF EXISTS "org_read_cycles" ON public.evaluation_cycles;

-- ================================================================
-- 4. "Users can X..." 英文ポリシー (新 employee_tasks_* / employee_task_steps_* と重複)
-- ================================================================
DROP POLICY IF EXISTS "Users can delete steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can create steps for own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can view steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can update steps of own employee tasks" ON public.employee_task_steps;
DROP POLICY IF EXISTS "Users can delete own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can create own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can view own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can update own employee tasks" ON public.employee_tasks;
DROP POLICY IF EXISTS "Users can send messages to accessible threads" ON public.messages;

-- ================================================================
-- 5. 日本語名の機能重複 (英名に統一)
--   注: form_fields「フォームフィールドを閲覧」と form_responses「自分の回答を閲覧」等は
--   英名対応物が無い (authenticated_* を今 drop したため) → 新規追加で置換
-- ================================================================
DROP POLICY IF EXISTS "フォームフィールドを閲覧" ON public.form_fields;
DROP POLICY IF EXISTS "管理者は組織内の申請を閲覧" ON public.workflow_requests;
DROP POLICY IF EXISTS "管理者は組織内の申請を更新" ON public.workflow_requests;

-- ================================================================
-- 6. 勤怠系の旧重複
-- ================================================================
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
DROP POLICY IF EXISTS "attendance_settings_select" ON public.attendance_settings;

-- ================================================================
-- 7. task_assignees_access / tasks_org_access (FOR ALL 広すぎ)
--   tasks は tasks_all_admin + tasks_select_org (後で追加) に統一
--   task_assignees は task_assignees_all_admin + task_assignees_select_org + task_assignees_select_own に統一
-- ================================================================
DROP POLICY IF EXISTS "task_assignees_access" ON public.task_assignees;
DROP POLICY IF EXISTS "tasks_org_access" ON public.tasks;

-- ================================================================
-- 8. 不足カバレッジの補完
-- ================================================================

-- job_sections: 組織員が読めるポリシーを追加 (削除した authenticated_read_job_sections の代替)
CREATE POLICY "job_sections_select_org" ON public.job_sections FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- form_fields: 組織員が読める + 応募者が所属組織のフォームフィールドを読めるように
CREATE POLICY "form_fields_select_org" ON public.form_fields FOR SELECT
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      WHERE cf.organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- tasks: 組織メンバーが SELECT (tasks_org_access の後継)
-- tasks_select_org が既存の場合もあるのでチェック
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_select_org'
  ) THEN
    CREATE POLICY "tasks_select_org" ON public.tasks FOR SELECT
      USING (organization_id IN (SELECT public.get_my_organization_ids()));
  END IF;
END $$;

-- tasks: 組織メンバーが自分のタスクを作成・更新できる
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND created_by = (auth.uid())::text
  );

CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE
  USING (
    created_by = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- task_assignees: アサイン本人が自分のアサインを更新 (既存の可能性あるので冪等)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='task_assignees' AND policyname='task_assignees_update_own'
  ) THEN
    CREATE POLICY "task_assignees_update_own" ON public.task_assignees FOR UPDATE
      USING (user_id = (auth.uid())::text);
  END IF;
END $$;
