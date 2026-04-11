-- ========================================================================
-- SECURITY DEFINER 関数の search_path hijack 対策
--
-- 背景: SECURITY DEFINER の関数で search_path が設定されていないと、
-- 呼び出し側の search_path で解決されてしまい、悪意のあるユーザーが
-- 同名の関数/テーブルを自身の schema に作成することで、
-- SECURITY DEFINER (=通常 postgres ロール) で任意コードを実行される
-- 攻撃が成立しうる (CVE-2018-1058 類似)。
--
-- 防御: 各 SECURITY DEFINER 関数に `SET search_path = public` を設定。
-- 関数本体は変更せず、ALTER FUNCTION で属性のみ付与。
--
-- 対象: 監査時点で search_path 未設定だった 14 関数
-- ========================================================================

-- 1. 旧 create_user_with_org (text[] 引数版) を削除
--    新版 (uuid[] + hiring_type 引数追加) が残っているため、古い方を削除
DROP FUNCTION IF EXISTS public.create_user_with_org(
  text, text, text, text, text, text, text, integer, text[]
);

-- 2. 各関数に SET search_path = public を付与
ALTER FUNCTION public.applicant_complete_step(uuid, uuid)
  SET search_path = public;

ALTER FUNCTION public.applicant_confirm_interview_slot(uuid, uuid, uuid)
  SET search_path = public;

ALTER FUNCTION public.auto_grant_leave_with_carry_over(text, integer)
  SET search_path = public;

ALTER FUNCTION public.calculate_leave_carry_over(text, integer)
  SET search_path = public;

ALTER FUNCTION public.get_threads_with_details(text, text)
  SET search_path = public;

ALTER FUNCTION public.mark_all_notifications_read()
  SET search_path = public;

ALTER FUNCTION public.mark_notifications_read(uuid[])
  SET search_path = public;

ALTER FUNCTION public.notify_application_status_change()
  SET search_path = public;

ALTER FUNCTION public.notify_application_step_change()
  SET search_path = public;

ALTER FUNCTION public.reorder_job_steps(uuid, uuid[], integer[])
  SET search_path = public;

ALTER FUNCTION public.submit_survey_response(text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.update_thread_updated_at()
  SET search_path = public;

ALTER FUNCTION public.upsert_push_token(text, text, text)
  SET search_path = public;
