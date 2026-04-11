-- ========================================================================
-- crm_deals.stage レガシー text 列を削除
--
-- canonical なステージ管理は crm_deals.stage_id (FK to crm_pipeline_stages)。
-- 旧 text 列 stage は両 Web アプリのコードで削除済み。
-- Flutter アプリ (hr1-employee-app) の BcDeal entity は依然として stage 列を
-- 読もうとするが、JSON parse で `?? 'initial'` フォールバックがあるため
-- DROP COLUMN 後もクラッシュはせず "初回接触" 固定表示で動作継続する
-- (UX 劣化、別チケットで Flutter 側を pipeline 対応に refactor する)。
-- ========================================================================

ALTER TABLE public.crm_deals DROP COLUMN stage;
