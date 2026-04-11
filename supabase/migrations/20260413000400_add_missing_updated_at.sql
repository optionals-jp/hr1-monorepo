-- ========================================================================
-- updated_at カラム + 自動更新トリガーを 24 テーブルに追加
--
-- 除外: ログ/履歴/append-only テーブル
--   (audit_logs*, push_notification_logs, crm_*_logs, activity_logs,
--    change_logs, page_sections, channel_members, user_organizations 等)
-- ========================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'attendance_approvers','certification_masters','compliance_alerts',
    'contract_changes','custom_forms','departments','employee_task_steps',
    'evaluation_anchors','evaluation_assignments','evaluation_criteria',
    'evaluation_scores','evaluation_templates','evaluations','interview_slots',
    'job_sections','job_steps','member_permission_groups','messages',
    'positions','project_team_members','project_teams','projects',
    'skill_masters','task_assignees'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- カラム追加 (冪等)
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()',
      t
    );
    -- トリガー再作成
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;
