-- ========================================================================
-- application_steps に applicant_action_at カラムを追加
-- 応募者がアクション（フォーム送信・面接予約）を完了した日時を記録する。
-- ステップの status とは独立して、応募者側のアクション完了を判定できる。
-- ========================================================================
ALTER TABLE public.application_steps
  ADD COLUMN IF NOT EXISTS applicant_action_at timestamptz;

-- ========================================================================
-- 応募者が自分の応募ステップを UPDATE できるポリシーを追加
-- completeStep（フォーム送信）や applicant_action_at 更新に必要
-- ========================================================================
DO $$ BEGIN
  CREATE POLICY "app_steps_update_own" ON public.application_steps FOR UPDATE
    USING (
      application_id IN (
        SELECT a.id FROM public.applications a WHERE a.applicant_id = auth.uid()::text
      )
    )
    WITH CHECK (
      application_id IN (
        SELECT a.id FROM public.applications a WHERE a.applicant_id = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
