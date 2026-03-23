-- ========================================================================
-- Phase 3: パフォーマンス向上のための主要インデックス追加
-- データ量増加に伴い遅延が発生するクエリを事前対策
-- ========================================================================

-- ========================================================================
-- workflow_requests: 申請検索の高速化
-- ========================================================================
-- ユーザーの申請一覧（ステータス別、新しい順）
CREATE INDEX IF NOT EXISTS idx_workflow_requests_user_status_created
  ON public.workflow_requests(user_id, status, created_at DESC);

-- 管理者の未処理申請検索
CREATE INDEX IF NOT EXISTS idx_workflow_requests_org_status_created
  ON public.workflow_requests(organization_id, status, created_at DESC);

-- ========================================================================
-- notifications: 通知一覧の高速化
-- ========================================================================
-- 組織 + 作成日（管理者が組織の全通知をフィルタ）
CREATE INDEX IF NOT EXISTS idx_notifications_org_created
  ON public.notifications(organization_id, created_at DESC);

-- ========================================================================
-- payslips: 月次給与処理の高速化
-- ========================================================================
-- ユーザーの給与明細一覧（年月順）
CREATE INDEX IF NOT EXISTS idx_payslips_user_year_month
  ON public.payslips(user_id, year DESC, month DESC);

-- 組織の月次給与処理
CREATE INDEX IF NOT EXISTS idx_payslips_org_year_month
  ON public.payslips(organization_id, year, month);

-- ========================================================================
-- applicant_todos: 管理者向け未完了一覧
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_applicant_todos_org_incomplete
  ON public.applicant_todos(organization_id, is_completed)
  WHERE is_completed = false;

-- ========================================================================
-- pulse_survey_responses: ユーザーのサーベイ完了状況
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_pulse_survey_responses_org_user
  ON public.pulse_survey_responses(organization_id, user_id, completed_at);

-- ========================================================================
-- applications: 組織別応募一覧（頻繁にフィルタされる）
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_applications_org_status
  ON public.applications(organization_id, status);

-- ========================================================================
-- messages: スレッド内メッセージの時系列取得
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON public.messages(thread_id, created_at DESC);

-- 未読メッセージ（read_at IS NULL）
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages(thread_id, sender_id)
  WHERE read_at IS NULL;

-- ========================================================================
-- evaluation_assignments: 評価者・対象者での検索
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_target_status
  ON public.evaluation_assignments(target_user_id, status);

CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_evaluator_status
  ON public.evaluation_assignments(evaluator_id, status);

-- ========================================================================
-- attendance_records: 月次集計クエリの高速化
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_date
  ON public.attendance_records(organization_id, date DESC);

-- ========================================================================
-- employee_departments: 部署別社員検索
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_employee_departments_dept
  ON public.employee_departments(department_id);

-- ========================================================================
-- leave_balances: 年度別検索
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_leave_balances_org_year
  ON public.leave_balances(organization_id, fiscal_year);
