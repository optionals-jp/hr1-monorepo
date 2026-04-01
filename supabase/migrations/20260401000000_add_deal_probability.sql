-- 商談テーブルに確度（probability）フィールドを追加
ALTER TABLE bc_deals ADD COLUMN probability integer;

-- 確度は0-100の範囲
ALTER TABLE bc_deals ADD CONSTRAINT bc_deals_probability_range
  CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100));

-- コメント
COMMENT ON COLUMN bc_deals.probability IS '受注確度（0-100%）。ステージ変更時にデフォルト値を自動設定';
