-- CRM保存ビュー: ユーザーがフィルタ・カラム・ソート条件をビューとして保存
-- Phase 2 Step 3

CREATE TABLE IF NOT EXISTS public.crm_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'contact', 'deal')),
  name text NOT NULL,
  is_shared boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_saved_views_org_entity
  ON public.crm_saved_views(organization_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_crm_saved_views_user
  ON public.crm_saved_views(user_id);

-- RLS ポリシー: 自分のビューまたは共有ビューを見れる
ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_saved_views_select ON public.crm_saved_views
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
    AND (user_id = auth.uid()::text OR is_shared = true)
  );

CREATE POLICY crm_saved_views_insert ON public.crm_saved_views
  FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
    AND user_id = auth.uid()::text
  );

CREATE POLICY crm_saved_views_update ON public.crm_saved_views
  FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY crm_saved_views_delete ON public.crm_saved_views
  FOR DELETE
  USING (user_id = auth.uid()::text);

COMMENT ON TABLE public.crm_saved_views IS 'CRM保存ビュー（フィルタ・カラム・ソート条件）';
COMMENT ON COLUMN public.crm_saved_views.config IS 'ビュー設定JSON: {columns: string[], filters: {field: string, operator: string, value: string}[], sort: {field: string, direction: "asc"|"desc"}}';
COMMENT ON COLUMN public.crm_saved_views.is_shared IS 'trueの場合、同じ組織の他メンバーにも表示';
