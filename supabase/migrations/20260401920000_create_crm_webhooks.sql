-- Phase 4: CRM Webhook 設定
-- 外部サービス連携のためのWebhookエンドポイント管理

CREATE TABLE IF NOT EXISTS public.crm_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text, -- HMAC署名用シークレット（任意）
  is_active boolean NOT NULL DEFAULT true,

  -- 購読するイベント（JSON配列）
  events text[] NOT NULL DEFAULT '{}',

  -- 追加ヘッダー（JSON: カスタム認証等）
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 統計
  last_triggered_at timestamptz,
  success_count int NOT NULL DEFAULT 0,
  failure_count int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook 送信ログ
CREATE TABLE IF NOT EXISTS public.crm_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES public.crm_webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  request_body jsonb NOT NULL,
  response_status int,
  response_body text,
  success boolean NOT NULL,
  error_message text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_crm_webhooks_org ON public.crm_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_webhooks_active ON public.crm_webhooks(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_webhook_logs_webhook ON public.crm_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_crm_webhook_logs_org ON public.crm_webhook_logs(organization_id);

-- updated_at トリガー
CREATE TRIGGER set_crm_webhooks_updated_at
  BEFORE UPDATE ON public.crm_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_webhooks_org_isolation" ON public.crm_webhooks
  FOR ALL USING (
    organization_id = get_my_organization_id()
  );

CREATE POLICY "crm_webhook_logs_org_isolation" ON public.crm_webhook_logs
  FOR ALL USING (
    organization_id = get_my_organization_id()
  );
