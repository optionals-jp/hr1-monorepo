-- 評価関連テーブルの id カラムに DEFAULT gen_random_uuid()::text を付与する。
--
-- 経緯:
--   `public.create_evaluation_template` と `public.submit_ad_hoc_evaluation`
--   の各 INSERT は id を明示指定せず、DB 側の DEFAULT に依存している。
--   しかし baseline.sql 時点で evaluation_* 系テーブルには DEFAULT が
--   付いておらず、RPC 実行時に NOT NULL 制約違反で失敗していた
--   （クライアント側では PostgrestError の列挙不可プロパティの影響で
--   console.error 出力が {} となり気付きにくかった）。
--   既存の `20260415000000_add_id_defaults.sql` は applications /
--   application_steps のみ対応しており、評価テーブルは積み残しだった。
--
-- 対象: evaluation_templates / evaluation_criteria / evaluation_anchors
--       / evaluations / evaluation_scores / evaluation_assignments
--       / evaluation_cycles の 7 テーブル。いずれも id text NOT NULL。

ALTER TABLE "public"."evaluation_templates"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluation_criteria"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluation_anchors"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluations"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluation_scores"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluation_assignments"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."evaluation_cycles"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
