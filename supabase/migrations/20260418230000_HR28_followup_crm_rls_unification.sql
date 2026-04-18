-- HR-28 follow-up: CRM 20 テーブル 65 policy を public.get_my_organization_ids() (SETOF) へ統一
--
-- 背景:
--   本番 pg_policies 実測 (2026-04-18) で、deprecated な public.get_my_organization_id()
--   (単数・LIMIT 1) を参照している policy が crm_* 20 テーブル / 65 本残存していた。
--   これらはマルチ組織所属ユーザーで他組織データを見落とすか、誤って1行に縮退する。
--   本 migration は全 65 policy を in-place で REPLACE し、SETOF 版 helper を使う形に揃える。
--
-- 事前裏取り (MCP execute_sql で 0 rows を確認済):
--   - pg_rewrite (view/rule 経由の参照): 0 件
--   - pg_proc (関数本体経由の参照): 0 件 (helper 自身を除く)
--   => 本 migration では policy のみ置換で完結。
--
-- 運用窓: 平日夜 off-peak 推奨（リリース前は本番 user が実質 0 のため影響軽微）
-- 方針:
--   - 全ポリシーを in-place REPLACE (DROP IF EXISTS → CREATE)
--   - per-cmd / ALL の対応はそのまま、roles 指定 (authenticated / public) も現行維持
--   - qual/with_check は `organization_id IN (SELECT public.get_my_organization_ids())` 形へ
--   - 参照経由テーブル (crm_pipeline_stages → crm_pipelines, crm_quote_items → crm_quotes) は
--     親テーブル経由の IN 句で scope
--   - UPDATE は USING + WITH CHECK 両方に付与（他 org への UPDATE を拒否）
--   - crm_saved_views は既存の user_id = auth.uid()::text 条件を温存
--
-- 旧 helper public.get_my_organization_id() は本 migration では DROP しない（ロールバック余地を残す）。
-- 参照が 0 になった後、別チケットで DROP 予定。
--
-- ロールバック:
--   緊急時は supabase/migrations/20260418230001_HR28_followup_crm_rls_unification_rollback.sql.skip
--   の .skip を外して apply_migration で逆戻し可能。

BEGIN;
SET LOCAL statement_timeout = '5min';

-- ====================================================================
-- (0) helper 関数の存在 assert
-- ====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_my_organization_ids'
  ) THEN
    RAISE EXCEPTION 'HR-28 Task B: public.get_my_organization_ids() is missing. Aborting.';
  END IF;
END $$;

-- ====================================================================
-- (1) crm_activities (per-cmd S/I/U/D, authenticated)
-- ====================================================================
DROP POLICY IF EXISTS crm_activities_select ON public.crm_activities;
CREATE POLICY crm_activities_select ON public.crm_activities
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_activities_insert ON public.crm_activities;
CREATE POLICY crm_activities_insert ON public.crm_activities
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_activities_update ON public.crm_activities;
CREATE POLICY crm_activities_update ON public.crm_activities
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_activities_delete ON public.crm_activities;
CREATE POLICY crm_activities_delete ON public.crm_activities
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (2) crm_automation_logs (ALL, public) - ALL-only SELECT テーブル
-- ====================================================================
DROP POLICY IF EXISTS crm_automation_logs_org_isolation ON public.crm_automation_logs;
CREATE POLICY crm_automation_logs_org_isolation ON public.crm_automation_logs
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (3) crm_automation_rules (ALL, public) - ALL-only SELECT テーブル
-- ====================================================================
DROP POLICY IF EXISTS crm_automation_rules_org_isolation ON public.crm_automation_rules;
CREATE POLICY crm_automation_rules_org_isolation ON public.crm_automation_rules
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (4) crm_cards (per-cmd S/I/D authenticated, U public - 現行維持)
-- ====================================================================
DROP POLICY IF EXISTS crm_cards_select ON public.crm_cards;
CREATE POLICY crm_cards_select ON public.crm_cards
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_cards_insert ON public.crm_cards;
CREATE POLICY crm_cards_insert ON public.crm_cards
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_cards_update ON public.crm_cards;
CREATE POLICY crm_cards_update ON public.crm_cards
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_cards_delete ON public.crm_cards;
CREATE POLICY crm_cards_delete ON public.crm_cards
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (5) crm_companies (per-cmd S/I/U/D, authenticated)
-- ====================================================================
DROP POLICY IF EXISTS crm_companies_select ON public.crm_companies;
CREATE POLICY crm_companies_select ON public.crm_companies
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_companies_insert ON public.crm_companies;
CREATE POLICY crm_companies_insert ON public.crm_companies
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_companies_update ON public.crm_companies;
CREATE POLICY crm_companies_update ON public.crm_companies
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_companies_delete ON public.crm_companies;
CREATE POLICY crm_companies_delete ON public.crm_companies
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (6) crm_contacts (per-cmd S/I/U/D, authenticated)
-- ====================================================================
DROP POLICY IF EXISTS crm_contacts_select ON public.crm_contacts;
CREATE POLICY crm_contacts_select ON public.crm_contacts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_contacts_insert ON public.crm_contacts;
CREATE POLICY crm_contacts_insert ON public.crm_contacts
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_contacts_update ON public.crm_contacts;
CREATE POLICY crm_contacts_update ON public.crm_contacts
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_contacts_delete ON public.crm_contacts;
CREATE POLICY crm_contacts_delete ON public.crm_contacts
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (7) crm_deal_contacts (per-cmd S/I/U/D, public - 現行維持)
-- ====================================================================
DROP POLICY IF EXISTS crm_deal_contacts_select ON public.crm_deal_contacts;
CREATE POLICY crm_deal_contacts_select ON public.crm_deal_contacts
  FOR SELECT TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deal_contacts_insert ON public.crm_deal_contacts;
CREATE POLICY crm_deal_contacts_insert ON public.crm_deal_contacts
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deal_contacts_update ON public.crm_deal_contacts;
CREATE POLICY crm_deal_contacts_update ON public.crm_deal_contacts
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deal_contacts_delete ON public.crm_deal_contacts;
CREATE POLICY crm_deal_contacts_delete ON public.crm_deal_contacts
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (8) crm_deals (per-cmd S/I/U/D, authenticated)
-- ====================================================================
DROP POLICY IF EXISTS crm_deals_select ON public.crm_deals;
CREATE POLICY crm_deals_select ON public.crm_deals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deals_insert ON public.crm_deals;
CREATE POLICY crm_deals_insert ON public.crm_deals
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deals_update ON public.crm_deals;
CREATE POLICY crm_deals_update ON public.crm_deals
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_deals_delete ON public.crm_deals;
CREATE POLICY crm_deals_delete ON public.crm_deals
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (9) crm_email_templates (ALL, public) - ALL-only SELECT テーブル
-- ====================================================================
DROP POLICY IF EXISTS crm_email_templates_org_isolation ON public.crm_email_templates;
CREATE POLICY crm_email_templates_org_isolation ON public.crm_email_templates
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (10) crm_field_definitions (per-cmd I/U/D + ALL, public)
--      ALL policy が SELECT の唯一の供給源なので保持する
-- ====================================================================
DROP POLICY IF EXISTS crm_field_definitions_insert ON public.crm_field_definitions;
CREATE POLICY crm_field_definitions_insert ON public.crm_field_definitions
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_definitions_update ON public.crm_field_definitions;
CREATE POLICY crm_field_definitions_update ON public.crm_field_definitions
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_definitions_delete ON public.crm_field_definitions;
CREATE POLICY crm_field_definitions_delete ON public.crm_field_definitions
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_definitions_org_isolation ON public.crm_field_definitions;
CREATE POLICY crm_field_definitions_org_isolation ON public.crm_field_definitions
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (11) crm_field_values (per-cmd I/U/D + ALL, public)
-- ====================================================================
DROP POLICY IF EXISTS crm_field_values_insert ON public.crm_field_values;
CREATE POLICY crm_field_values_insert ON public.crm_field_values
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_values_update ON public.crm_field_values;
CREATE POLICY crm_field_values_update ON public.crm_field_values
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_values_delete ON public.crm_field_values;
CREATE POLICY crm_field_values_delete ON public.crm_field_values
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_field_values_org_isolation ON public.crm_field_values;
CREATE POLICY crm_field_values_org_isolation ON public.crm_field_values
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (12) crm_leads (per-cmd S/I/U/D, public - 現行維持)
-- ====================================================================
DROP POLICY IF EXISTS crm_leads_select ON public.crm_leads;
CREATE POLICY crm_leads_select ON public.crm_leads
  FOR SELECT TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_leads_insert ON public.crm_leads;
CREATE POLICY crm_leads_insert ON public.crm_leads
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_leads_update ON public.crm_leads;
CREATE POLICY crm_leads_update ON public.crm_leads
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_leads_delete ON public.crm_leads;
CREATE POLICY crm_leads_delete ON public.crm_leads
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (13) crm_pipeline_stages (per-cmd I/U/D + ALL, public)
--      pipeline_id 経由の IN scope
-- ====================================================================
DROP POLICY IF EXISTS crm_pipeline_stages_insert ON public.crm_pipeline_stages;
CREATE POLICY crm_pipeline_stages_insert ON public.crm_pipeline_stages
  FOR INSERT TO public
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_pipeline_stages_update ON public.crm_pipeline_stages;
CREATE POLICY crm_pipeline_stages_update ON public.crm_pipeline_stages
  FOR UPDATE TO public
  USING (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_pipeline_stages_delete ON public.crm_pipeline_stages;
CREATE POLICY crm_pipeline_stages_delete ON public.crm_pipeline_stages
  FOR DELETE TO public
  USING (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_pipeline_stages_org_isolation ON public.crm_pipeline_stages;
CREATE POLICY crm_pipeline_stages_org_isolation ON public.crm_pipeline_stages
  FOR ALL TO public
  USING (
    pipeline_id IN (
      SELECT id FROM public.crm_pipelines
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ====================================================================
-- (14) crm_pipelines (per-cmd I/U/D + ALL, public)
-- ====================================================================
DROP POLICY IF EXISTS crm_pipelines_insert ON public.crm_pipelines;
CREATE POLICY crm_pipelines_insert ON public.crm_pipelines
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_pipelines_update ON public.crm_pipelines;
CREATE POLICY crm_pipelines_update ON public.crm_pipelines
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_pipelines_delete ON public.crm_pipelines;
CREATE POLICY crm_pipelines_delete ON public.crm_pipelines
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_pipelines_org_isolation ON public.crm_pipelines;
CREATE POLICY crm_pipelines_org_isolation ON public.crm_pipelines
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (15) crm_quote_items (per-cmd S/I/U/D, public)
--      quote_id 経由の IN scope
-- ====================================================================
DROP POLICY IF EXISTS crm_quote_items_select ON public.crm_quote_items;
CREATE POLICY crm_quote_items_select ON public.crm_quote_items
  FOR SELECT TO public
  USING (
    quote_id IN (
      SELECT id FROM public.crm_quotes
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_quote_items_insert ON public.crm_quote_items;
CREATE POLICY crm_quote_items_insert ON public.crm_quote_items
  FOR INSERT TO public
  WITH CHECK (
    quote_id IN (
      SELECT id FROM public.crm_quotes
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_quote_items_update ON public.crm_quote_items;
CREATE POLICY crm_quote_items_update ON public.crm_quote_items
  FOR UPDATE TO public
  USING (
    quote_id IN (
      SELECT id FROM public.crm_quotes
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM public.crm_quotes
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

DROP POLICY IF EXISTS crm_quote_items_delete ON public.crm_quote_items;
CREATE POLICY crm_quote_items_delete ON public.crm_quote_items
  FOR DELETE TO public
  USING (
    quote_id IN (
      SELECT id FROM public.crm_quotes
      WHERE organization_id IN (SELECT public.get_my_organization_ids())
    )
  );

-- ====================================================================
-- (16) crm_quotes (per-cmd S/I/U/D, public)
-- ====================================================================
DROP POLICY IF EXISTS crm_quotes_select ON public.crm_quotes;
CREATE POLICY crm_quotes_select ON public.crm_quotes
  FOR SELECT TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_quotes_insert ON public.crm_quotes;
CREATE POLICY crm_quotes_insert ON public.crm_quotes
  FOR INSERT TO public
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_quotes_update ON public.crm_quotes;
CREATE POLICY crm_quotes_update ON public.crm_quotes
  FOR UPDATE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_quotes_delete ON public.crm_quotes;
CREATE POLICY crm_quotes_delete ON public.crm_quotes
  FOR DELETE TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (17) crm_saved_views (per-cmd S/I/U/D, public)
--      user_id = auth.uid()::text の追加条件を温存
-- ====================================================================
DROP POLICY IF EXISTS crm_saved_views_select ON public.crm_saved_views;
CREATE POLICY crm_saved_views_select ON public.crm_saved_views
  FOR SELECT TO public
  USING (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND (user_id = (auth.uid())::text OR is_shared = true)
  );

DROP POLICY IF EXISTS crm_saved_views_insert ON public.crm_saved_views;
CREATE POLICY crm_saved_views_insert ON public.crm_saved_views
  FOR INSERT TO public
  WITH CHECK (
    organization_id IN (SELECT public.get_my_organization_ids())
    AND user_id = (auth.uid())::text
  );

DROP POLICY IF EXISTS crm_saved_views_update ON public.crm_saved_views;
CREATE POLICY crm_saved_views_update ON public.crm_saved_views
  FOR UPDATE TO public
  USING (
    user_id = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    user_id = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

DROP POLICY IF EXISTS crm_saved_views_delete ON public.crm_saved_views;
CREATE POLICY crm_saved_views_delete ON public.crm_saved_views
  FOR DELETE TO public
  USING (
    user_id = (auth.uid())::text
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

-- ====================================================================
-- (18) crm_todos (per-cmd S/I/U/D, authenticated)
-- ====================================================================
DROP POLICY IF EXISTS crm_todos_select ON public.crm_todos;
CREATE POLICY crm_todos_select ON public.crm_todos
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_todos_insert ON public.crm_todos;
CREATE POLICY crm_todos_insert ON public.crm_todos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_todos_update ON public.crm_todos;
CREATE POLICY crm_todos_update ON public.crm_todos
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.get_my_organization_ids()));

DROP POLICY IF EXISTS crm_todos_delete ON public.crm_todos;
CREATE POLICY crm_todos_delete ON public.crm_todos
  FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (19) crm_webhook_logs (ALL, public)
-- ====================================================================
DROP POLICY IF EXISTS crm_webhook_logs_org_isolation ON public.crm_webhook_logs;
CREATE POLICY crm_webhook_logs_org_isolation ON public.crm_webhook_logs
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- (20) crm_webhooks (ALL, public)
-- ====================================================================
DROP POLICY IF EXISTS crm_webhooks_org_isolation ON public.crm_webhooks;
CREATE POLICY crm_webhooks_org_isolation ON public.crm_webhooks
  FOR ALL TO public
  USING (organization_id IN (SELECT public.get_my_organization_ids()));

-- ====================================================================
-- ASSERTS
-- ====================================================================

-- assert #1: deprecated get_my_organization_id() 参照が 0 件
DO $$
DECLARE v_remaining int;
BEGIN
  SELECT COUNT(*) INTO v_remaining FROM pg_policies
  WHERE schemaname='public'
    AND (qual::text ~ 'get_my_organization_id\(\)'
         OR with_check::text ~ 'get_my_organization_id\(\)');
  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'HR-28 Task B: % policies still reference deprecated get_my_organization_id()', v_remaining;
  END IF;
END $$;

-- assert #2: crm_* 全ポリシーが PERMISSIVE (RESTRICTIVE 混入検知)
DO $$
DECLARE v_bad int;
BEGIN
  SELECT COUNT(*) INTO v_bad FROM pg_policies
  WHERE schemaname='public' AND tablename LIKE 'crm_%' AND permissive <> 'PERMISSIVE';
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'HR-28 Task B: % non-PERMISSIVE crm_* policies detected', v_bad;
  END IF;
END $$;

-- assert #3: ALL-only SELECT テーブルで、get_my_organization_ids() を参照する ALL policy が残存
DO $$
DECLARE v_missing text[];
BEGIN
  SELECT array_agg(t) INTO v_missing FROM (
    SELECT unnest(ARRAY[
      'crm_automation_logs','crm_automation_rules','crm_email_templates',
      'crm_field_definitions','crm_field_values',
      'crm_pipeline_stages','crm_pipelines',
      'crm_webhook_logs','crm_webhooks'
    ]) AS t
    EXCEPT
    SELECT tablename FROM pg_policies
    WHERE schemaname='public' AND cmd='ALL'
      AND qual::text ~ 'get_my_organization_ids\(\)'
  ) x;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'HR-28 Task B: qualifying ALL policy missing on %', v_missing;
  END IF;
END $$;

COMMIT;
