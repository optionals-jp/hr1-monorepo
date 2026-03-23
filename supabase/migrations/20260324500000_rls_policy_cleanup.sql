-- ========================================================================
-- RLSポリシー整理・補完
-- 初期テーブル定義でRLS有効化されていたがポリシー未定義だったテーブルに
-- 適切なポリシーを追加し、audit_logs のアクセス制御を強化する
-- ========================================================================

-- ========================================================================
-- 2. profiles: 重複する管理者UPDATEポリシーを削除
--    20260323350000 で "管理者がプロフィールを更新" (FOR UPDATE) を追加したが、
--    20260324300000 で "profiles_all_admin" (FOR ALL) を追加済み。FOR ALL が
--    SELECT/INSERT/UPDATE/DELETE 全てをカバーするため UPDATE 専用は不要。
-- ========================================================================
DROP POLICY IF EXISTS "管理者がプロフィールを更新" ON public.profiles;

-- ========================================================================
-- 3. employee_departments: ポリシー追加
--    RLS有効だがポリシーが存在しなかった
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "emp_dept_select_org" ON public.employee_departments FOR SELECT
    USING (
      department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "emp_dept_all_admin" ON public.employee_departments FOR ALL
    USING (
      department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 4. job_steps: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "job_steps_select_org" ON public.job_steps FOR SELECT
    USING (
      job_id IN (
        SELECT j.id FROM public.jobs j
        WHERE j.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "job_steps_all_admin" ON public.job_steps FOR ALL
    USING (
      job_id IN (
        SELECT j.id FROM public.jobs j
        WHERE j.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      job_id IN (
        SELECT j.id FROM public.jobs j
        WHERE j.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 5. application_steps: 自分の応募 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "app_steps_select_own" ON public.application_steps FOR SELECT
    USING (
      application_id IN (
        SELECT a.id FROM public.applications a WHERE a.applicant_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "app_steps_all_admin" ON public.application_steps FOR ALL
    USING (
      application_id IN (
        SELECT a.id FROM public.applications a
        WHERE a.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      application_id IN (
        SELECT a.id FROM public.applications a
        WHERE a.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 6. interviews: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "interviews_select_org" ON public.interviews FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "interviews_all_admin" ON public.interviews FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 7. interview_slots: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "interview_slots_select_org" ON public.interview_slots FOR SELECT
    USING (
      interview_id IN (
        SELECT i.id FROM public.interviews i
        WHERE i.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "interview_slots_all_admin" ON public.interview_slots FOR ALL
    USING (
      interview_id IN (
        SELECT i.id FROM public.interviews i
        WHERE i.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      interview_id IN (
        SELECT i.id FROM public.interviews i
        WHERE i.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 8. evaluation_templates: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "eval_templates_select_org" ON public.evaluation_templates FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "eval_templates_all_admin" ON public.evaluation_templates FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 9. evaluation_criteria: テンプレート経由で組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "eval_criteria_select_org" ON public.evaluation_criteria FOR SELECT
    USING (
      template_id IN (
        SELECT et.id FROM public.evaluation_templates et
        WHERE et.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "eval_criteria_all_admin" ON public.evaluation_criteria FOR ALL
    USING (
      template_id IN (
        SELECT et.id FROM public.evaluation_templates et
        WHERE et.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      template_id IN (
        SELECT et.id FROM public.evaluation_templates et
        WHERE et.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 10. evaluation_anchors: 基準経由で組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "eval_anchors_select_org" ON public.evaluation_anchors FOR SELECT
    USING (
      criterion_id IN (
        SELECT ec.id FROM public.evaluation_criteria ec
        JOIN public.evaluation_templates et ON et.id = ec.template_id
        WHERE et.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "eval_anchors_all_admin" ON public.evaluation_anchors FOR ALL
    USING (
      criterion_id IN (
        SELECT ec.id FROM public.evaluation_criteria ec
        JOIN public.evaluation_templates et ON et.id = ec.template_id
        WHERE et.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      criterion_id IN (
        SELECT ec.id FROM public.evaluation_criteria ec
        JOIN public.evaluation_templates et ON et.id = ec.template_id
        WHERE et.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 11. evaluation_cycles: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "eval_cycles_select_org" ON public.evaluation_cycles FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "eval_cycles_all_admin" ON public.evaluation_cycles FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 12. evaluation_assignments: 関係者閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "eval_assignments_select_related" ON public.evaluation_assignments FOR SELECT
    USING (
      target_user_id = auth.uid()::text
      OR evaluator_id = auth.uid()::text
      OR cycle_id IN (
        SELECT ec.id FROM public.evaluation_cycles ec
        WHERE ec.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "eval_assignments_all_admin" ON public.evaluation_assignments FOR ALL
    USING (
      cycle_id IN (
        SELECT ec.id FROM public.evaluation_cycles ec
        WHERE ec.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      cycle_id IN (
        SELECT ec.id FROM public.evaluation_cycles ec
        WHERE ec.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 13. evaluations: 関係者閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "evaluations_select_related" ON public.evaluations FOR SELECT
    USING (
      evaluator_id = auth.uid()::text
      OR target_user_id = auth.uid()::text
      OR organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "evaluations_insert_evaluator" ON public.evaluations FOR INSERT
    WITH CHECK (
      evaluator_id = auth.uid()::text
      OR organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "evaluations_update_evaluator" ON public.evaluations FOR UPDATE
    USING (
      evaluator_id = auth.uid()::text
      OR organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 14. attendance_records: 自分 + 同組織管理者
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "attendance_records_select_own" ON public.attendance_records FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_records_insert_own" ON public.attendance_records FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_records_update_own" ON public.attendance_records FOR UPDATE
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_records_all_admin" ON public.attendance_records FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 15. attendance_punches: 自分 + 同組織管理者
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "attendance_punches_select_own" ON public.attendance_punches FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_punches_insert_own" ON public.attendance_punches FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_punches_all_admin" ON public.attendance_punches FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 16. attendance_settings: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "attendance_settings_select_org" ON public.attendance_settings FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_settings_all_admin" ON public.attendance_settings FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 17. attendance_approvers: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "attendance_approvers_select_org" ON public.attendance_approvers FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_approvers_all_admin" ON public.attendance_approvers FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 18. attendance_corrections: 自分 + 同組織管理者
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "attendance_corrections_select_own" ON public.attendance_corrections FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_corrections_insert_own" ON public.attendance_corrections FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_corrections_update_own" ON public.attendance_corrections FOR UPDATE
    USING (user_id = auth.uid()::text AND status = 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "attendance_corrections_all_admin" ON public.attendance_corrections FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 19. projects: 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "projects_select_org" ON public.projects FOR SELECT
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects_all_admin" ON public.projects FOR ALL
    USING (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 20. project_teams: プロジェクト経由で組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "project_teams_select_org" ON public.project_teams FOR SELECT
    USING (
      project_id IN (
        SELECT pr.id FROM public.projects pr
        WHERE pr.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_teams_all_admin" ON public.project_teams FOR ALL
    USING (
      project_id IN (
        SELECT pr.id FROM public.projects pr
        WHERE pr.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      project_id IN (
        SELECT pr.id FROM public.projects pr
        WHERE pr.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 21. project_team_members: チーム経由で組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "project_team_members_select_org" ON public.project_team_members FOR SELECT
    USING (
      team_id IN (
        SELECT pt.id FROM public.project_teams pt
        JOIN public.projects pr ON pr.id = pt.project_id
        WHERE pr.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_team_members_all_admin" ON public.project_team_members FOR ALL
    USING (
      team_id IN (
        SELECT pt.id FROM public.project_teams pt
        JOIN public.projects pr ON pr.id = pt.project_id
        WHERE pr.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      team_id IN (
        SELECT pt.id FROM public.project_teams pt
        JOIN public.projects pr ON pr.id = pt.project_id
        WHERE pr.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================================================
-- 22. task_assignees: 自分 + 組織メンバー閲覧 + 管理者管理
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "task_assignees_select_own" ON public.task_assignees FOR SELECT
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "task_assignees_select_org" ON public.task_assignees FOR SELECT
    USING (
      task_id IN (
        SELECT t.id FROM public.tasks t
        WHERE t.organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()::text
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "task_assignees_update_own" ON public.task_assignees FOR UPDATE
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "task_assignees_all_admin" ON public.task_assignees FOR ALL
    USING (
      task_id IN (
        SELECT t.id FROM public.tasks t
        WHERE t.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    )
    WITH CHECK (
      task_id IN (
        SELECT t.id FROM public.tasks t
        WHERE t.organization_id IN (
          SELECT uo.organization_id FROM public.user_organizations uo
          JOIN public.profiles p ON p.id = uo.user_id
          WHERE uo.user_id = auth.uid()::text AND p.role = 'admin'
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
