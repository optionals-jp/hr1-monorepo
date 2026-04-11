-- ========================================================================
-- 法定保存義務に抵触する CASCADE FK を緩和
--
-- レビューで指摘:
--   * form_responses.applicant_id CASCADE → 職業安定法・個情法 (採用記録3年保存)
--   * leave_balances.user_id CASCADE → 労基法115条 (賃金関係5年保存)
--   * shift_schedules / shift_requests.user_id CASCADE → 労基法109条
--
-- 方針:
--   * form_responses: applicant_id を nullable 化 → SET NULL (匿名化保存)
--   * leave_balances / shift_*: NO ACTION に変更 (物理削除をブロック)
-- ========================================================================

-- ================================================================
-- 1. form_responses: applicant_id を nullable + SET NULL
-- ================================================================
ALTER TABLE public.form_responses ALTER COLUMN applicant_id DROP NOT NULL;

ALTER TABLE public.form_responses
  DROP CONSTRAINT form_responses_applicant_id_fkey;

ALTER TABLE public.form_responses
  ADD CONSTRAINT form_responses_applicant_id_fkey
  FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ================================================================
-- 2. leave_balances: NO ACTION (退職者削除をブロック → 移管後に実施)
-- ================================================================
ALTER TABLE public.leave_balances
  DROP CONSTRAINT leave_balances_user_id_fkey;

ALTER TABLE public.leave_balances
  ADD CONSTRAINT leave_balances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

-- ================================================================
-- 3. shift_schedules: NO ACTION
-- ================================================================
ALTER TABLE public.shift_schedules
  DROP CONSTRAINT shift_schedules_user_id_fkey;

ALTER TABLE public.shift_schedules
  ADD CONSTRAINT shift_schedules_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

-- ================================================================
-- 4. shift_requests: NO ACTION
-- ================================================================
ALTER TABLE public.shift_requests
  DROP CONSTRAINT shift_requests_user_id_fkey;

ALTER TABLE public.shift_requests
  ADD CONSTRAINT shift_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

-- ================================================================
-- 注: 退職者の物理削除は以下の手順で行う運用とすること:
--   1. 該当ユーザーの leave_balances / shift_* を別組織/会社移管 or アーカイブ
--   2. profiles を削除 (CASCADE で残レコード自動削除)
--   3. または profiles に soft-delete カラム追加で論理削除に切替 (推奨)
-- ========================================================================
