-- ========================================================================
-- profiles に姓名分離フィールドを追加
--
-- 背景: 現状 display_name (text) のみで姓名を1フィールド管理しており、
-- 検索・五十音順ソート・宛名フォーマット (姓のみ呼称等) ができない。
-- crm_contacts 等他テーブルとの命名整合性も合わせる。
--
-- 方針:
--   * last_name / first_name / last_name_kana / first_name_kana を追加 (nullable)
--   * 既存 display_name / name_kana から自動分割 (スペース区切り)
--   * display_name は維持 (既存 UI 互換)。完全移行は別フェーズ
-- ========================================================================

-- ================================================================
-- 1. カラム追加
-- ================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name_kana text,
  ADD COLUMN IF NOT EXISTS first_name_kana text;

-- ================================================================
-- 2. 既存データを自動分割
--    スペース区切りなら最初のスペースで分割
--    スペース無しは全部 last_name に格納 (慣習: 姓を主)
-- ================================================================
UPDATE public.profiles
SET
  last_name = CASE
    WHEN display_name LIKE '% %' THEN split_part(display_name, ' ', 1)
    WHEN display_name LIKE '%　%' THEN split_part(display_name, '　', 1)
    ELSE display_name
  END,
  first_name = CASE
    WHEN display_name LIKE '% %'
      THEN substring(display_name FROM position(' ' IN display_name) + 1)
    WHEN display_name LIKE '%　%'
      THEN substring(display_name FROM position('　' IN display_name) + 1)
    ELSE NULL
  END
WHERE display_name IS NOT NULL
  AND last_name IS NULL;

UPDATE public.profiles
SET
  last_name_kana = CASE
    WHEN name_kana LIKE '% %' THEN split_part(name_kana, ' ', 1)
    WHEN name_kana LIKE '%　%' THEN split_part(name_kana, '　', 1)
    ELSE name_kana
  END,
  first_name_kana = CASE
    WHEN name_kana LIKE '% %'
      THEN substring(name_kana FROM position(' ' IN name_kana) + 1)
    WHEN name_kana LIKE '%　%'
      THEN substring(name_kana FROM position('　' IN name_kana) + 1)
    ELSE NULL
  END
WHERE name_kana IS NOT NULL
  AND last_name_kana IS NULL;

-- ================================================================
-- 3. インデックス (五十音順ソート用)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_last_name_kana
  ON public.profiles(last_name_kana, first_name_kana)
  WHERE last_name_kana IS NOT NULL;

-- ================================================================
-- 注: display_name は維持される (既存 UI 互換)。
-- 新規作成 RPC や member 編集 UI が姓名分離フィールドを使うように
-- アップデートされた後、display_name は generated column 化または
-- 廃止する (次フェーズ)。
-- ========================================================================
