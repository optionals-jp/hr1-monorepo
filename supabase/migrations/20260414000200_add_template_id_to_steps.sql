-- job_steps に template_id を追加（どのテンプレートから作られたかを追跡）
ALTER TABLE "public"."job_steps"
    ADD COLUMN "template_id" "uuid" REFERENCES "public"."selection_step_templates"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."job_steps"."template_id" IS '作成元の選考ステップテンプレートID';
CREATE INDEX "idx_job_steps_template" ON "public"."job_steps" USING "btree" ("template_id");

-- application_steps に template_id を追加（job_steps からコピーされる）
ALTER TABLE "public"."application_steps"
    ADD COLUMN "template_id" "uuid" REFERENCES "public"."selection_step_templates"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."application_steps"."template_id" IS '作成元の選考ステップテンプレートID（job_stepsからコピー）';
CREATE INDEX "idx_app_steps_template" ON "public"."application_steps" USING "btree" ("template_id");
