-- ========================================================================
-- bc_* テーブルを crm_* にリネーム
--
-- 背景: bc_ プレフィックス (business card 由来) と crm_ プレフィックスが
-- 同一ドメイン内で混在していたため、CRM ドメインに統一する。
--
-- リネーム対象: 10 テーブル
--   bc_activities    → crm_activities
--   bc_cards         → crm_cards
--   bc_companies     → crm_companies
--   bc_contacts      → crm_contacts
--   bc_deal_contacts → crm_deal_contacts
--   bc_deals         → crm_deals
--   bc_leads         → crm_leads
--   bc_quote_items   → crm_quote_items
--   bc_quotes        → crm_quotes
--   bc_todos         → crm_todos
--
-- PostgreSQL ALTER TABLE RENAME は FK / インデックス / ポリシー / トリガー /
-- 制約参照を全て自動更新する (制約・ポリシー名自体は古いまま残る)。
-- 名称統一のため、ポリシー・制約名も明示的に rename する。
-- ========================================================================

-- ================================================================
-- 1. テーブル本体のリネーム
-- ================================================================
ALTER TABLE public.bc_activities    RENAME TO crm_activities;
ALTER TABLE public.bc_cards         RENAME TO crm_cards;
ALTER TABLE public.bc_companies     RENAME TO crm_companies;
ALTER TABLE public.bc_contacts      RENAME TO crm_contacts;
ALTER TABLE public.bc_deal_contacts RENAME TO crm_deal_contacts;
ALTER TABLE public.bc_deals         RENAME TO crm_deals;
ALTER TABLE public.bc_leads         RENAME TO crm_leads;
ALTER TABLE public.bc_quote_items   RENAME TO crm_quote_items;
ALTER TABLE public.bc_quotes        RENAME TO crm_quotes;
ALTER TABLE public.bc_todos         RENAME TO crm_todos;

-- ================================================================
-- 2. RLS ポリシー名のリネーム (40 本)
-- ================================================================
DO $$
DECLARE
  r record;
  new_name text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename LIKE 'crm_%'
      AND policyname LIKE 'bc\_%'
  LOOP
    new_name := replace(r.policyname, 'bc_', 'crm_');
    EXECUTE format(
      'ALTER POLICY %I ON public.%I RENAME TO %I',
      r.policyname, r.tablename, new_name
    );
  END LOOP;
END $$;

-- ================================================================
-- 3. インデックス名のリネーム
-- ================================================================
DO $$
DECLARE
  r record;
  new_name text;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE 'idx_bc\_%'
  LOOP
    new_name := replace(r.indexname, 'idx_bc_', 'idx_crm_');
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.indexname, new_name);
  END LOOP;
END $$;

-- ================================================================
-- 4. 制約名のリネーム (FK / CHECK / UNIQUE)
-- ================================================================
DO $$
DECLARE
  r record;
  new_name text;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tname
    FROM pg_constraint c
    WHERE c.connamespace = 'public'::regnamespace
      AND c.conname LIKE 'bc\_%'
  LOOP
    new_name := replace(r.conname, 'bc_', 'crm_');
    EXECUTE format(
      'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
      split_part(r.tname, '.', -1), r.conname, new_name
    );
  END LOOP;
END $$;

-- ================================================================
-- 5. トリガー名のリネーム
-- ================================================================
DO $$
DECLARE
  r record;
  new_name text;
BEGIN
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' AND trigger_name LIKE '%_bc\_%'
  LOOP
    new_name := replace(r.trigger_name, '_bc_', '_crm_');
    EXECUTE format(
      'ALTER TRIGGER %I ON public.%I RENAME TO %I',
      r.trigger_name, r.event_object_table, new_name
    );
  END LOOP;
END $$;
