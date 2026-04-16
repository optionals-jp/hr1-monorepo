-- 応募者が自分の応募に紐づく interviews / interview_slots を閲覧できるようにする
-- 応募者は user_organizations に所属しないため、既存の _select_org ポリシーでは参照できない
--
-- アクセス経路: applications → application_steps.interview_id → interviews
-- interviews.application_id は NULL のケースが多いため使用しない

CREATE POLICY "interviews_select_applicant" ON public.interviews
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT ast.interview_id
      FROM public.application_steps ast
      JOIN public.applications a ON a.id = ast.application_id
      WHERE a.applicant_id = auth.uid()::text
        AND ast.interview_id IS NOT NULL
    )
  );

CREATE POLICY "interview_slots_select_applicant" ON public.interview_slots
  FOR SELECT TO authenticated
  USING (
    interview_id IN (
      SELECT ast.interview_id
      FROM public.application_steps ast
      JOIN public.applications a ON a.id = ast.application_id
      WHERE a.applicant_id = auth.uid()::text
        AND ast.interview_id IS NOT NULL
    )
  );
