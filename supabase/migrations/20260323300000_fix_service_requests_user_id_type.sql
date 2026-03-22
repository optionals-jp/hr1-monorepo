-- service_requests の user_id を UUID から TEXT に変更（他テーブルと統一）

-- 既存の RLS ポリシーを削除
DROP POLICY IF EXISTS "Users can view own service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Users can create service requests" ON public.service_requests;

-- 既存のトリガーと専用関数を削除
DROP TRIGGER IF EXISTS set_service_requests_updated_at ON public.service_requests;
DROP FUNCTION IF EXISTS public.update_service_requests_updated_at();

-- FK制約を削除してから型変更
ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS service_requests_user_id_fkey;
ALTER TABLE public.service_requests ALTER COLUMN user_id TYPE text USING user_id::text;

-- RLS ポリシーを再作成（auth.uid()::text パターン）
CREATE POLICY "自分のリクエストを閲覧"
  ON public.service_requests FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "自分のリクエストを作成"
  ON public.service_requests FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 共通の updated_at トリガーを使用
CREATE TRIGGER set_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
