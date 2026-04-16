ALTER TABLE "public"."selection_step_templates"
    ADD COLUMN "form_id" "text" REFERENCES "public"."custom_forms"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."selection_step_templates"."form_id" IS '書類選考ステップで使用するフォームID（フォーム選考の場合に設定）';
CREATE INDEX "idx_sst_form" ON "public"."selection_step_templates" USING "btree" ("form_id");
