-- ========================================================================
-- 最終レビューで判明した追加の問題を解消
--
-- 1. attendance_approvers の重複 CHECK 制約整理
--    - 旧 approver_target_check (2 カラム XOR) を削除
--    - attendance_approvers_target_required (>=1) を削除
--    - attendance_approvers_target_check (3 カラム XOR) を canonical として残す
--    → 1 承認者は user_id/department_id/project_id のいずれか 1 つのみ
--
-- 2. create_user_with_org の重複オーバーロード解消
--    22 引数版を削除し、24 引数版 (hiring_type + graduation_year 含む) を canonical に
--
-- 3. 残り 6 本の FK index 追加
--    監査で漏れた FK カラムに index 追加
-- ========================================================================

-- ================================================================
-- 1. attendance_approvers CHECK 制約整理
-- ================================================================
ALTER TABLE public.attendance_approvers
  DROP CONSTRAINT IF EXISTS approver_target_check,
  DROP CONSTRAINT IF EXISTS attendance_approvers_target_required;

-- attendance_approvers_target_check (3カラム XOR) が canonical として残る

-- ================================================================
-- 2. 古い create_user_with_org (22引数版) を削除
--    新 24 引数版 (hiring_type + graduation_year) を canonical に
-- ================================================================
DROP FUNCTION IF EXISTS public.create_user_with_org(
  text, text, text, text, text, text, uuid[], text, text,
  date, date, text, text, text, text, text, text, text, text, text, text, text
);

-- ================================================================
-- 3. 残り 6 本の FK index 追加
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_approvers_approver
  ON public.attendance_approvers(approver_id);

CREATE INDEX IF NOT EXISTS idx_attendance_approvers_project
  ON public.attendance_approvers(project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_survey_answers_question
  ON public.pulse_survey_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_user_organizations_organization
  ON public.user_organizations(organization_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criterion
  ON public.evaluation_scores(criterion_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_widget_preferences_organization
  ON public.dashboard_widget_preferences(organization_id);
