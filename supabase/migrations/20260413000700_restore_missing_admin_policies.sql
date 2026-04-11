-- ========================================================================
-- 20260413000100/000200 のクリーンアップで穴が開いた管理ポリシーの補完
--
-- 削除した authenticated_delete_* / authenticated_update_* 等の代替として
-- admin_only または所有者用の RLS ポリシーを追加する。
--
-- レビューで判明した致命的回帰:
--   * evaluations / evaluation_scores: deleteScoresByEvaluation() が拒否される
--   * form_responses: 応募者の下書き更新/管理者削除が不可
--   * pulse_survey_responses / answers: GDPR 削除要請に対応不可
--   * workflow_requests / service_requests: 管理者の delete 不可
--   * bc_cards: UPDATE 不可
-- ========================================================================

-- ================================================================
-- 1. evaluations: 管理者と評価者本人の DELETE
-- ================================================================
CREATE POLICY "evaluations_delete_admin" ON public.evaluations FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- ================================================================
-- 2. evaluation_scores: 管理者と評価者本人の DELETE
--    (deleteScoresByEvaluation 経由でサイクル再実行時に呼ばれる)
-- ================================================================
CREATE POLICY "evaluation_scores_delete_evaluator" ON public.evaluation_scores FOR DELETE
  USING (
    evaluation_id IN (
      SELECT id FROM public.evaluations
      WHERE evaluator_id = (auth.uid())::text
    )
  );

CREATE POLICY "evaluation_scores_delete_admin" ON public.evaluation_scores FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND evaluation_id IN (
      SELECT id FROM public.evaluations
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ================================================================
-- 3. form_responses: 応募者の下書き更新 + 管理者の削除
-- ================================================================
CREATE POLICY "form_responses_update_own" ON public.form_responses FOR UPDATE
  USING (applicant_id = (auth.uid())::text)
  WITH CHECK (applicant_id = (auth.uid())::text);

CREATE POLICY "form_responses_delete_admin" ON public.form_responses FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND form_id IN (
      SELECT id FROM public.custom_forms
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ================================================================
-- 4. pulse_survey_responses / answers: 本人 DELETE + 管理者 DELETE (GDPR)
-- ================================================================
CREATE POLICY "pulse_survey_responses_delete_own" ON public.pulse_survey_responses FOR DELETE
  USING (user_id = (auth.uid())::text);

CREATE POLICY "pulse_survey_responses_delete_admin" ON public.pulse_survey_responses FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "pulse_survey_answers_delete_own" ON public.pulse_survey_answers FOR DELETE
  USING (
    response_id IN (
      SELECT id FROM public.pulse_survey_responses WHERE user_id = (auth.uid())::text
    )
  );

CREATE POLICY "pulse_survey_answers_delete_admin" ON public.pulse_survey_answers FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND response_id IN (
      SELECT id FROM public.pulse_survey_responses
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ================================================================
-- 5. workflow_requests: 管理者と本人の DELETE
-- ================================================================
CREATE POLICY "workflow_requests_delete_admin" ON public.workflow_requests FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "workflow_requests_delete_own" ON public.workflow_requests FOR DELETE
  USING (user_id = (auth.uid())::text AND status = 'pending');

-- ================================================================
-- 6. service_requests: 管理者の DELETE (スパム対応)
-- ================================================================
CREATE POLICY "service_requests_delete_admin" ON public.service_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (auth.uid())::text AND p.role = 'admin'
    )
  );

-- ================================================================
-- 7. bc_cards: UPDATE (OCR 再実行・カード情報修正)
-- ================================================================
CREATE POLICY "bc_cards_update" ON public.bc_cards FOR UPDATE
  USING (organization_id = public.get_my_organization_id());

-- ================================================================
-- 8. job_sections: INSERT/UPDATE/DELETE (job 編集に必要)
--    現状アプリ未参照だが、テーブルが存在する以上 admin 編集を許可しておく
-- ================================================================
CREATE POLICY "job_sections_all_admin" ON public.job_sections FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND job_id IN (
      SELECT id FROM public.jobs
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND job_id IN (
      SELECT id FROM public.jobs
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ================================================================
-- 9. audit_logs_errors: RLS 有効でポリシー 0 本だった
--    Edge Function (service_role) のみ書き込む設計 → 管理者の閲覧のみ追加
-- ================================================================
CREATE POLICY "audit_logs_errors_select_admin" ON public.audit_logs_errors FOR SELECT
  USING (public.get_my_role() = 'admin');

COMMENT ON TABLE public.audit_logs_errors IS
  'service_role 専用テーブル。INSERT は Edge Function 経由のみ。SELECT は admin に限定';
