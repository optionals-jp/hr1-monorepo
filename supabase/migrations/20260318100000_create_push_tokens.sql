-- プッシュ通知トークン管理テーブル
CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_type text NOT NULL CHECK (app_type IN ('employee', 'applicant')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- インデックス
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- updated_at 自動更新
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分のトークンのみ
CREATE POLICY "push_tokens_select_own" ON push_tokens FOR SELECT USING (
  user_id = auth.uid()::text
);

-- INSERT: 自分のトークンのみ
CREATE POLICY "push_tokens_insert_own" ON push_tokens FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
);

-- UPDATE: 自分のトークンのみ
CREATE POLICY "push_tokens_update_own" ON push_tokens FOR UPDATE USING (
  user_id = auth.uid()::text
);

-- DELETE: 自分のトークンのみ
CREATE POLICY "push_tokens_delete_own" ON push_tokens FOR DELETE USING (
  user_id = auth.uid()::text
);

-- ========================================================================
-- RPC: トークンを登録/更新する（upsert）
-- ========================================================================
CREATE OR REPLACE FUNCTION upsert_push_token(
  p_token text,
  p_platform text,
  p_app_type text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id text;
BEGIN
  v_user_id := auth.uid()::text;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '認証が必要です';
  END IF;

  INSERT INTO push_tokens (user_id, token, platform, app_type)
  VALUES (v_user_id, p_token, p_platform, p_app_type)
  ON CONFLICT (user_id, token)
  DO UPDATE SET platform = p_platform, app_type = p_app_type, updated_at = now();
END;
$$;
