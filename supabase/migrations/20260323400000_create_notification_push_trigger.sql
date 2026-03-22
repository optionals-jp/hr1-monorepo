-- 通知作成時にプッシュ通知を自動送信するトリガー
-- pg_net 拡張を使用して Edge Function を呼び出す

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- プッシュ通知送信トリガー関数
CREATE OR REPLACE FUNCTION public.send_push_on_notification_insert()
RETURNS trigger AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Supabase の設定から URL と Service Role Key を取得
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- 設定が存在する場合のみプッシュ通知を送信
  IF _supabase_url IS NOT NULL AND _service_role_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := _supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', COALESCE(NEW.body, ''),
        'action_url', NEW.action_url
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
CREATE TRIGGER trigger_send_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification_insert();
