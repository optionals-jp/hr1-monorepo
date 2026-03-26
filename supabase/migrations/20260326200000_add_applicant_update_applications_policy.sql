-- ========================================================================
-- applications: 応募者が自分の応募ステータスを更新（辞退）できるポリシーを追加
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "applications_update_own" ON public.applications FOR UPDATE
    USING (applicant_id = auth.uid()::text)
    WITH CHECK (applicant_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
