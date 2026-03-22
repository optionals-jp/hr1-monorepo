-- 有給休暇自動付与のスケジュールジョブを設定
-- pg_cron を使用して毎日 JST 0:00 (UTC 15:00) に Edge Function を呼び出す

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 注意: pg_cron ジョブは Supabase Dashboard から設定するか、
-- 以下のコマンドで設定可能（Supabase の pg_cron 有効化が必要）
--
-- SELECT cron.schedule(
--   'auto-grant-leave',
--   '0 15 * * *',
--   $$
--   SELECT extensions.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-grant-leave',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   )
--   $$
-- );
--
-- pg_cron はプロジェクトの設定により利用可能かどうかが異なるため、
-- 本マイグレーションでは拡張の有効化のみ行い、ジョブ登録はダッシュボードで行う
