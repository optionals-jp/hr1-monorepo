-- ========================================================================
-- profiles.organization_id / profiles.organization_name の drift 列を削除
--
-- 背景: profiles には以下の矛盾する組織関連カラムが存在していた:
--   * organization_id (text, FK to organizations)  ← legacy drift
--   * organization_name (text)                     ← 非正規化 legacy
--
-- HR1 はマルチテナント (1人が複数組織所属可能) で、canonical な
-- 組織メンバーシップは user_organizations テーブルで管理する設計。
-- profiles 上の直接組織参照は設計原則に反する。
--
-- 事前検証済み: profiles.organization_id が set された 2 件全て
-- user_organizations に対応レコードが存在。データ損失リスクゼロ。
-- ========================================================================

-- FK を先に DROP
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

-- 列を削除
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS organization_name;
