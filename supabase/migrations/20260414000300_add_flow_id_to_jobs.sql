-- 求人に選考フローへの直接参照を追加
ALTER TABLE "public"."jobs"
    ADD COLUMN "flow_id" "uuid" REFERENCES "public"."selection_flows"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."jobs"."flow_id" IS '使用する選考フローID';
CREATE INDEX "idx_jobs_flow" ON "public"."jobs" USING "btree" ("flow_id");
