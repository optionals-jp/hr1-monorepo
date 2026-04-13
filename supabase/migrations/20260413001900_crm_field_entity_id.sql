-- crm_field_definitions にエンティティ固有フィールドを可能にする entity_id カラムを追加
-- entity_id が NULL の場合: 組織全体のフィールド定義（全企業/連絡先/商談に適用）
-- entity_id が設定されている場合: その特定エンティティだけのカスタムフィールド

ALTER TABLE crm_field_definitions
  ADD COLUMN IF NOT EXISTS entity_id text DEFAULT NULL;

-- エンティティ固有フィールド検索用のインデックス
CREATE INDEX IF NOT EXISTS idx_crm_field_defs_entity
  ON crm_field_definitions (organization_id, entity_type, entity_id);
