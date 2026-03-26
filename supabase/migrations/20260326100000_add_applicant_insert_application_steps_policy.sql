-- ========================================================================
-- application_steps: 応募者が自分の応募のステップを INSERT できるポリシーを追加
-- apply() メソッドで application_steps を作成するために必要
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "app_steps_insert_own" ON public.application_steps FOR INSERT
    WITH CHECK (
      application_id IN (
        SELECT a.id FROM public.applications a WHERE a.applicant_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
