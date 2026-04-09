-- manager/approver ロールを追加
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'employee', 'applicant', 'manager', 'approver'));

-- manager/approver が組織内のワークフロー申請を閲覧できるポリシー
CREATE POLICY "workflow_requests_select_manager"
  ON public.workflow_requests FOR SELECT
  USING (
    public.get_my_role() IN ('manager', 'approver')
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- manager/approver が組織内の申請を承認・却下できるポリシー
CREATE POLICY "workflow_requests_update_manager"
  ON public.workflow_requests FOR UPDATE
  USING (
    public.get_my_role() IN ('manager', 'approver')
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- evaluator自身が evaluation_assignments の status を更新できるポリシー
CREATE POLICY "eval_assignments_update_evaluator"
  ON public.evaluation_assignments FOR UPDATE
  USING (evaluator_id = auth.uid()::text)
  WITH CHECK (evaluator_id = auth.uid()::text);

-- evaluation_scores: evaluator が自分の評価スコアを操作可能
CREATE POLICY "eval_scores_select_evaluator"
  ON public.evaluation_scores FOR SELECT
  USING (
    evaluation_id IN (
      SELECT id FROM public.evaluations WHERE evaluator_id = auth.uid()::text
    )
  );

CREATE POLICY "eval_scores_insert_evaluator"
  ON public.evaluation_scores FOR INSERT
  WITH CHECK (
    evaluation_id IN (
      SELECT id FROM public.evaluations WHERE evaluator_id = auth.uid()::text
    )
  );

CREATE POLICY "eval_scores_update_evaluator"
  ON public.evaluation_scores FOR UPDATE
  USING (
    evaluation_id IN (
      SELECT id FROM public.evaluations WHERE evaluator_id = auth.uid()::text
    )
  );
