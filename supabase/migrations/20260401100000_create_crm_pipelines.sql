-- パイプラインカスタマイズ: テナント毎に営業パイプライン・ステージを自由定義
-- Phase 2 Step 1

-- パイプライン定義テーブル
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_org
  ON public.crm_pipelines(organization_id);

-- ステージ定義テーブル
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  probability_default integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_stages_probability_range
    CHECK (probability_default >= 0 AND probability_default <= 100)
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline
  ON public.crm_pipeline_stages(pipeline_id);

-- bc_deals に pipeline_id と stage_id を追加
ALTER TABLE public.bc_deals
  ADD COLUMN pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  ADD COLUMN stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bc_deals_pipeline
  ON public.bc_deals(pipeline_id);

-- RLS ポリシー
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_pipelines_org_isolation ON public.crm_pipelines
  USING (organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY crm_pipeline_stages_org_isolation ON public.crm_pipeline_stages
  USING (pipeline_id IN (
    SELECT id FROM public.crm_pipelines
    WHERE organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  ));

COMMENT ON TABLE public.crm_pipelines IS 'テナント毎のCRMパイプライン定義';
COMMENT ON TABLE public.crm_pipeline_stages IS 'パイプラインのステージ定義（順序・色・デフォルト確度）';
COMMENT ON COLUMN public.bc_deals.pipeline_id IS '所属パイプライン（NULLの場合デフォルトパイプライン）';
COMMENT ON COLUMN public.bc_deals.stage_id IS 'ステージID（NULLの場合レガシーstageカラムを使用）';
