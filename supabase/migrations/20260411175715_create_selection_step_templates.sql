-- ========================================================================
-- 選考ステップテンプレート
-- 組織ごとに再利用可能な選考ステップのマスタを定義する。
-- 求人作成時に `job_steps.label` / `job_steps.step_type` としてコピー利用される。
-- ========================================================================

CREATE TABLE public.selection_step_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- step_type の値は TypeScript 側の StepType enum と同期すること
  -- 参照: hr1-employee-web/src/lib/constants/recruiting.ts (StepType)
  --       hr1-console/src/lib/constants/steps.ts (StepStatus と対になる定義)
  step_type text NOT NULL CHECK (step_type IN ('screening', 'form', 'interview', 'external_test', 'offer')),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_sst_org ON public.selection_step_templates(organization_id, sort_order);
CREATE INDEX idx_sst_org_type ON public.selection_step_templates(organization_id, step_type);

ALTER TABLE public.selection_step_templates ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- updated_at 自動更新トリガー
-- ========================================================================

CREATE OR REPLACE FUNCTION public.touch_selection_step_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sst_updated_at
  BEFORE UPDATE ON public.selection_step_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_selection_step_templates_updated_at();

-- ========================================================================
-- RLS ポリシー
-- - SELECT: 自組織のレコードは全員参照可能
-- - INSERT/UPDATE/DELETE: admin ロールのみ
-- ========================================================================

CREATE POLICY "sst_select_org" ON public.selection_step_templates FOR SELECT
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

CREATE POLICY "sst_insert_admin" ON public.selection_step_templates FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "sst_update_admin" ON public.selection_step_templates FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY "sst_delete_admin" ON public.selection_step_templates FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- ========================================================================
-- コメント
-- ========================================================================

COMMENT ON TABLE public.selection_step_templates IS '選考ステップテンプレート: 求人作成時に再利用する名前付き選考ステップのマスタ';
COMMENT ON COLUMN public.selection_step_templates.name IS '選考ステップ名（例: 書類選考、1次面接、最終面接、内定）';
COMMENT ON COLUMN public.selection_step_templates.step_type IS 'ステップ種別: screening / form / interview / external_test / offer';
COMMENT ON COLUMN public.selection_step_templates.sort_order IS 'テンプレート一覧での並び順（小さいほど上に表示）';
