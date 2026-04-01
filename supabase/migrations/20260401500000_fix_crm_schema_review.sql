-- =============================================
-- CRM スキーマレビュー修正
-- Phase 1-3 で発見された問題の一括修正
-- =============================================

-- =============================================
-- 1. bc_leads: トリガー関数名修正 + 型不整合修正
-- =============================================

-- 誤ったトリガー関数名を修正
DROP TRIGGER IF EXISTS set_bc_leads_updated_at ON public.bc_leads;
CREATE TRIGGER update_bc_leads_updated_at
  BEFORE UPDATE ON public.bc_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- assigned_to/created_by の型を text に修正（他テーブルと統一）
-- auth.users(id) は uuid 型だが、profiles(id) は text 型で統一されている
ALTER TABLE public.bc_leads
  ALTER COLUMN assigned_to TYPE text USING assigned_to::text,
  ALTER COLUMN created_by TYPE text USING created_by::text;

-- 外部キー制約を profiles に変更（他テーブルとの一貫性）
ALTER TABLE public.bc_leads
  DROP CONSTRAINT IF EXISTS bc_leads_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS bc_leads_created_by_fkey;

ALTER TABLE public.bc_leads
  ADD CONSTRAINT bc_leads_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT bc_leads_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =============================================
-- 2. crm_pipelines: RLS CRUD ポリシー追加
-- =============================================

CREATE POLICY crm_pipelines_insert ON public.crm_pipelines
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_pipelines_update ON public.crm_pipelines
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_pipelines_delete ON public.crm_pipelines
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

-- crm_pipeline_stages: RLS CRUD ポリシー追加
CREATE POLICY crm_pipeline_stages_insert ON public.crm_pipeline_stages
  FOR INSERT WITH CHECK (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY crm_pipeline_stages_update ON public.crm_pipeline_stages
  FOR UPDATE USING (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY crm_pipeline_stages_delete ON public.crm_pipeline_stages
  FOR DELETE USING (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- =============================================
-- 3. crm_field_definitions: RLS CRUD ポリシー追加
-- =============================================

CREATE POLICY crm_field_definitions_insert ON public.crm_field_definitions
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_field_definitions_update ON public.crm_field_definitions
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_field_definitions_delete ON public.crm_field_definitions
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

-- crm_field_values: RLS CRUD ポリシー追加
CREATE POLICY crm_field_values_insert ON public.crm_field_values
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_field_values_update ON public.crm_field_values
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY crm_field_values_delete ON public.crm_field_values
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

-- =============================================
-- 4. crm_saved_views: UPDATE/DELETE に org チェック追加
-- =============================================

DROP POLICY IF EXISTS crm_saved_views_update ON public.crm_saved_views;
CREATE POLICY crm_saved_views_update ON public.crm_saved_views
  FOR UPDATE USING (
    user_id = auth.uid()::text
    AND organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS crm_saved_views_delete ON public.crm_saved_views;
CREATE POLICY crm_saved_views_delete ON public.crm_saved_views
  FOR DELETE USING (
    user_id = auth.uid()::text
    AND organization_id = (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid() LIMIT 1)
  );

-- =============================================
-- 5. updated_at トリガー追加（欠落していたテーブル）
-- =============================================

CREATE TRIGGER update_crm_pipelines_updated_at
  BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_field_definitions_updated_at
  BEFORE UPDATE ON public.crm_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_field_values_updated_at
  BEFORE UPDATE ON public.crm_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_saved_views_updated_at
  BEFORE UPDATE ON public.crm_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
