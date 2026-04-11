-- ========================================================================
-- 最終監査で発見された 4 件の真の重複ポリシーを削除
--
-- 各削除対象は他のポリシーと機能的に完全重複 (同じ qual / with_check):
--   * applications.applicant_read_own_applications
--       = applications_select_own
--   * evaluation_scores.eval_scores_insert_evaluator
--       = evaluation_scores_insert (alias 違いのみ)
--   * evaluation_scores.eval_scores_select_evaluator
--       ⊂ evaluation_scores_select (後者がより広いスコープを含む)
--   * evaluation_scores.eval_scores_update_evaluator
--       = evaluation_scores_update (alias 違いのみ)
-- ========================================================================

DROP POLICY IF EXISTS "applicant_read_own_applications" ON public.applications;
DROP POLICY IF EXISTS "eval_scores_insert_evaluator" ON public.evaluation_scores;
DROP POLICY IF EXISTS "eval_scores_select_evaluator" ON public.evaluation_scores;
DROP POLICY IF EXISTS "eval_scores_update_evaluator" ON public.evaluation_scores;
