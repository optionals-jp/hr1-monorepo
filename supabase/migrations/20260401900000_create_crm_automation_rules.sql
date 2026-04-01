-- Phase 4: CRM Automation Rules Engine
-- トリガー・条件・アクションベースの自動化ルール

-- 自動化ルールテーブル
CREATE TABLE IF NOT EXISTS public.crm_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,

  -- トリガー定義
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'deal_stage_changed',
    'deal_created',
    'deal_won',
    'deal_lost',
    'lead_created',
    'lead_status_changed',
    'lead_converted',
    'contact_created',
    'company_created',
    'activity_created'
  )),

  -- 条件（JSON: フィールド比較の配列）
  -- 例: [{"field": "amount", "operator": "gte", "value": 1000000}]
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- アクション定義（JSON配列: 複数アクション実行可能）
  -- 例: [{"type": "create_todo", "params": {"title": "フォローアップ", "due_days": 3}}]
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,

  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 自動化ルール実行ログ
CREATE TABLE IF NOT EXISTS public.crm_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.crm_automation_rules(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  actions_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_org ON public.crm_automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_trigger ON public.crm_automation_rules(organization_id, trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_automation_logs_org ON public.crm_automation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_logs_rule ON public.crm_automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_crm_automation_logs_entity ON public.crm_automation_logs(entity_type, entity_id);

-- updated_at トリガー
CREATE TRIGGER set_crm_automation_rules_updated_at
  BEFORE UPDATE ON public.crm_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_automation_rules_org_isolation" ON public.crm_automation_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "crm_automation_logs_org_isolation" ON public.crm_automation_logs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
