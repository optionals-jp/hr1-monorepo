-- ========================================================================
-- Phase 1-3: RLSポリシー修正
-- Phase 1-6: 制約追加
-- ========================================================================

-- ========================================================================
-- 1. workflow_requests: 管理者UPDATEに WITH CHECK 追加
--    問題: organization_id を別組織に変更可能だった
-- ========================================================================
DROP POLICY IF EXISTS "管理者は組織内の申請を更新" ON public.workflow_requests;

CREATE POLICY "管理者は組織内の申請を更新"
  ON public.workflow_requests FOR UPDATE
  USING (
    organization_id IN (
      SELECT uo.organization_id FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- ========================================================================
-- 2. service_requests: 管理者SELECTポリシー追加
--    問題: 管理者がバグ報告・機能リクエストを閲覧できなかった
-- ========================================================================
CREATE POLICY "管理者が全リクエストを閲覧"
  ON public.service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- 管理者がステータスを更新可能（トリアージ用）
CREATE POLICY "管理者がリクエストを更新"
  ON public.service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- ========================================================================
-- 3. applicant_todos: 自動生成TODOの削除制限
--    問題: ユーザーがシステム生成TODOを削除→再作成で重複リスク
-- ========================================================================
DROP POLICY IF EXISTS "applicant_todos_delete_own" ON public.applicant_todos;

CREATE POLICY "applicant_todos_delete_manual_only"
  ON public.applicant_todos FOR DELETE
  USING (
    user_id = auth.uid()::text
    AND source = 'manual'
  );

-- ========================================================================
-- 4. form_change_logs: 管理者向けSELECTポリシー追加
--    問題: FOR ALL だと SELECT は WITH CHECK が適用されず読めない場合がある
--    対策: 明示的な SELECT ポリシーを追加
-- ========================================================================
CREATE POLICY "管理者が変更履歴を閲覧"
  ON public.form_change_logs FOR SELECT
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- ========================================================================
-- 5. evaluation_scores: 評価スコアのアクセス制御強化
--    問題: 評価者以外がスコアを閲覧できる可能性
--    対策: 自分が評価者 or 対象者 or 管理者のみ閲覧可能
-- ========================================================================
DO $$
BEGIN
  -- 既存ポリシーがあれば削除（初期テーブルでポリシー未定義の場合もある）
  DROP POLICY IF EXISTS "evaluation_scores_select" ON public.evaluation_scores;
  DROP POLICY IF EXISTS "evaluation_scores_insert" ON public.evaluation_scores;
  DROP POLICY IF EXISTS "evaluation_scores_update" ON public.evaluation_scores;
END $$;

-- 閲覧: 自分が評価者 or 管理者
CREATE POLICY "evaluation_scores_select"
  ON public.evaluation_scores FOR SELECT
  USING (
    evaluation_id IN (
      SELECT e.id FROM public.evaluations e
      WHERE e.evaluator_id = auth.uid()::text
         OR e.target_user_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- 作成・更新: 自分が評価者のみ
CREATE POLICY "evaluation_scores_insert"
  ON public.evaluation_scores FOR INSERT
  WITH CHECK (
    evaluation_id IN (
      SELECT e.id FROM public.evaluations e
      WHERE e.evaluator_id = auth.uid()::text
    )
  );

CREATE POLICY "evaluation_scores_update"
  ON public.evaluation_scores FOR UPDATE
  USING (
    evaluation_id IN (
      SELECT e.id FROM public.evaluations e
      WHERE e.evaluator_id = auth.uid()::text
    )
  );

-- ========================================================================
-- 6. applicant_todos: source + source_id の UNIQUE 制約
--    問題: 同じサーベイ/フォームから重複TODOが作成されるリスク
--    対策: source が 'manual' 以外の場合、source + source_id + user_id で一意
-- ========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicant_todos_source_unique
  ON public.applicant_todos (user_id, source, source_id)
  WHERE source != 'manual' AND source_id IS NOT NULL;
