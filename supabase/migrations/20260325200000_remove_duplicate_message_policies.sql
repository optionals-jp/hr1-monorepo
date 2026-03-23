-- ========================================================================
-- メッセージRLSの再帰評価チェーン修正
-- messages → message_threads RLS → profiles RLS → user_organizations RLS の
-- チェーンがapplicantロールでエラーを引き起こしていた。
-- SECURITY DEFINER関数でRLS評価を断ち切る。
-- ========================================================================

-- 旧ポリシー（直接JOIN版）を削除
DROP POLICY IF EXISTS "Users can view messages in accessible threads" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in accessible threads" ON public.messages;
DROP POLICY IF EXISTS "Users can view threads in their organization or own threads" ON public.message_threads;

-- アクセス可能なthread_idを返すSECURITY DEFINER関数
CREATE OR REPLACE FUNCTION public.get_my_accessible_thread_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM message_threads WHERE participant_id = auth.uid()::text
  UNION
  SELECT id FROM message_threads
  WHERE organization_id IN (SELECT get_my_organization_ids())
    AND public.get_my_role() IN ('admin', 'employee')
  UNION
  SELECT thread_id FROM channel_members WHERE user_id = auth.uid()::text;
$$;

-- threads_select をhelper関数ベースに置換
DROP POLICY IF EXISTS "threads_select" ON public.message_threads;
CREATE POLICY "threads_select" ON public.message_threads FOR SELECT
  USING (id IN (SELECT public.get_my_accessible_thread_ids()));

-- messages_select_thread_member をhelper関数ベースに置換
DROP POLICY IF EXISTS "messages_select_thread_member" ON public.messages;
CREATE POLICY "messages_select_thread_member" ON public.messages FOR SELECT
  USING (thread_id IN (SELECT public.get_my_accessible_thread_ids()));

-- messages_insert_authenticated もhelper関数ベースに置換
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
CREATE POLICY "messages_insert_authenticated" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text
    AND thread_id IN (SELECT public.get_my_accessible_thread_ids())
  );
