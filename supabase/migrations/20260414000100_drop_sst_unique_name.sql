-- 選考ステップテンプレート名の重複を許可する
-- 同一組織内で同名のステップ（例: 複数フローに「一次面接」）を作成可能にする
ALTER TABLE "public"."selection_step_templates"
    DROP CONSTRAINT IF EXISTS "selection_step_templates_organization_id_name_key";
