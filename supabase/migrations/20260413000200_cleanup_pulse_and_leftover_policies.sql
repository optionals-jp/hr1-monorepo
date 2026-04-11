-- ========================================================================
-- 第2弾: pulse_survey_* / departments / applications の authenticated_* 掃除
--
-- 前弾で漏れた user_org_ids 依存ポリシーを削除し、
-- pulse_survey_* には置換用の新ポリシーを追加する。
-- ========================================================================

-- ================================================================
-- 1. pulse_surveys: 組織管理者のみ管理、組織メンバーは SELECT
-- ================================================================
CREATE POLICY "pulse_surveys_select_org" ON public.pulse_surveys FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "pulse_surveys_all_admin" ON public.pulse_surveys FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

DROP POLICY IF EXISTS "authenticated_delete_pulse_surveys" ON public.pulse_surveys;
DROP POLICY IF EXISTS "authenticated_write_pulse_surveys" ON public.pulse_surveys;
DROP POLICY IF EXISTS "authenticated_read_pulse_surveys" ON public.pulse_surveys;
DROP POLICY IF EXISTS "authenticated_update_pulse_surveys" ON public.pulse_surveys;

-- ================================================================
-- 2. pulse_survey_questions: survey 経由で組織メンバー SELECT、admin 管理
-- ================================================================
CREATE POLICY "pulse_survey_questions_select_org" ON public.pulse_survey_questions FOR SELECT
  USING (
    survey_id IN (
      SELECT id FROM public.pulse_surveys
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

CREATE POLICY "pulse_survey_questions_all_admin" ON public.pulse_survey_questions FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND survey_id IN (
      SELECT id FROM public.pulse_surveys
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND survey_id IN (
      SELECT id FROM public.pulse_surveys
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS "authenticated_delete_pulse_survey_questions" ON public.pulse_survey_questions;
DROP POLICY IF EXISTS "authenticated_write_pulse_survey_questions" ON public.pulse_survey_questions;
DROP POLICY IF EXISTS "authenticated_read_pulse_survey_questions" ON public.pulse_survey_questions;
DROP POLICY IF EXISTS "authenticated_update_pulse_survey_questions" ON public.pulse_survey_questions;

-- ================================================================
-- 3. pulse_survey_responses: 本人のみ自分の回答を操作、admin が集計閲覧
-- ================================================================
CREATE POLICY "pulse_survey_responses_select_own" ON public.pulse_survey_responses FOR SELECT
  USING (user_id = (auth.uid())::text);

CREATE POLICY "pulse_survey_responses_select_admin" ON public.pulse_survey_responses FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "pulse_survey_responses_insert_own" ON public.pulse_survey_responses FOR INSERT
  WITH CHECK (
    user_id = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "pulse_survey_responses_update_own" ON public.pulse_survey_responses FOR UPDATE
  USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "authenticated_write_pulse_survey_responses" ON public.pulse_survey_responses;
DROP POLICY IF EXISTS "authenticated_read_pulse_survey_responses" ON public.pulse_survey_responses;
DROP POLICY IF EXISTS "authenticated_update_pulse_survey_responses" ON public.pulse_survey_responses;

-- ================================================================
-- 4. pulse_survey_answers: response 経由で本人のみ、admin が組織内を閲覧
-- ================================================================
CREATE POLICY "pulse_survey_answers_select_own" ON public.pulse_survey_answers FOR SELECT
  USING (
    response_id IN (
      SELECT id FROM public.pulse_survey_responses WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "pulse_survey_answers_select_admin" ON public.pulse_survey_answers FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND response_id IN (
      SELECT id FROM public.pulse_survey_responses
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

CREATE POLICY "pulse_survey_answers_insert_own" ON public.pulse_survey_answers FOR INSERT
  WITH CHECK (
    response_id IN (
      SELECT id FROM public.pulse_survey_responses WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "pulse_survey_answers_update_own" ON public.pulse_survey_answers FOR UPDATE
  USING (
    response_id IN (
      SELECT id FROM public.pulse_survey_responses WHERE user_id = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "authenticated_write_pulse_survey_answers" ON public.pulse_survey_answers;
DROP POLICY IF EXISTS "authenticated_read_pulse_survey_answers" ON public.pulse_survey_answers;
DROP POLICY IF EXISTS "authenticated_update_pulse_survey_answers" ON public.pulse_survey_answers;

-- ================================================================
-- 5. applications / departments / employee_departments の残り authenticated_*
--    (既に *_all_admin が存在するので drop のみで安全)
-- ================================================================
DROP POLICY IF EXISTS "authenticated_delete_applications" ON public.applications;
DROP POLICY IF EXISTS "authenticated_delete_departments" ON public.departments;
DROP POLICY IF EXISTS "authenticated_update_departments" ON public.departments;
DROP POLICY IF EXISTS "authenticated_write_departments" ON public.departments;
DROP POLICY IF EXISTS "authenticated_delete_employee_departments" ON public.employee_departments;
DROP POLICY IF EXISTS "authenticated_update_employee_departments" ON public.employee_departments;
DROP POLICY IF EXISTS "authenticated_write_employee_departments" ON public.employee_departments;
