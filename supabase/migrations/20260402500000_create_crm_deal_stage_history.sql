-- ============================================================
-- CRM商談ステージ変更履歴
-- パイプライン速度・滞留時間の分析に使用
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.bc_deals(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id uuid NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE CASCADE,
  from_stage_name text,
  to_stage_name text NOT NULL,
  changed_by text REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_history_org
  ON public.crm_deal_stage_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_history_deal
  ON public.crm_deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_history_date
  ON public.crm_deal_stage_history(organization_id, changed_at DESC);

-- RLS
ALTER TABLE public.crm_deal_stage_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "crm_deal_stage_history_select" ON public.crm_deal_stage_history
    FOR SELECT USING (
      organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "crm_deal_stage_history_insert" ON public.crm_deal_stage_history
    FOR INSERT WITH CHECK (
      organization_id IN (SELECT public.get_my_organization_ids())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.crm_deal_stage_history IS '商談ステージ変更履歴（パイプライン速度分析用）';
COMMENT ON COLUMN public.crm_deal_stage_history.from_stage_name IS 'ステージ名のスナップショット（ステージ定義変更時のため）';
COMMENT ON COLUMN public.crm_deal_stage_history.to_stage_name IS 'ステージ名のスナップショット（ステージ定義変更時のため）';
