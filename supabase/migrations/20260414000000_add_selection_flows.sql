-- 選考フローテーブル: 選考ステップをグループ化する親テーブル
CREATE TABLE IF NOT EXISTS "public"."selection_flows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "selection_flows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "selection_flows_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."selection_flows" IS '選考フロー: 選考ステップをグループ化するマスタ（例: エンジニア採用フロー、営業採用フロー）';
COMMENT ON COLUMN "public"."selection_flows"."name" IS '選考フロー名（例: エンジニア採用フロー）';

-- updated_at トリガー
CREATE TRIGGER "set_selection_flows_updated_at"
    BEFORE UPDATE ON "public"."selection_flows"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- インデックス
CREATE INDEX "idx_sf_org" ON "public"."selection_flows" USING "btree" ("organization_id");

-- RLS 有効化
ALTER TABLE "public"."selection_flows" ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（selection_step_templates と同じパターン）
CREATE POLICY "sf_select_org" ON "public"."selection_flows"
    FOR SELECT USING (
        "organization_id" IN (SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids")
    );

CREATE POLICY "sf_insert_admin" ON "public"."selection_flows"
    FOR INSERT WITH CHECK (
        ("public"."get_my_role"() = 'admin'::"text")
        AND ("organization_id" IN (SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))
    );

CREATE POLICY "sf_update_admin" ON "public"."selection_flows"
    FOR UPDATE
    USING (
        ("public"."get_my_role"() = 'admin'::"text")
        AND ("organization_id" IN (SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))
    )
    WITH CHECK (
        ("public"."get_my_role"() = 'admin'::"text")
        AND ("organization_id" IN (SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))
    );

CREATE POLICY "sf_delete_admin" ON "public"."selection_flows"
    FOR DELETE USING (
        ("public"."get_my_role"() = 'admin'::"text")
        AND ("organization_id" IN (SELECT "public"."get_my_organization_ids"() AS "get_my_organization_ids"))
    );

-- selection_step_templates に flow_id カラム追加
ALTER TABLE "public"."selection_step_templates"
    ADD COLUMN "flow_id" "uuid" REFERENCES "public"."selection_flows"("id") ON DELETE CASCADE;

COMMENT ON COLUMN "public"."selection_step_templates"."flow_id" IS '所属する選考フローID';

CREATE INDEX "idx_sst_flow" ON "public"."selection_step_templates" USING "btree" ("flow_id");
