ALTER TABLE "public"."selection_step_templates"
    ADD COLUMN "requires_review" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."job_steps"
    ADD COLUMN "requires_review" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."application_steps"
    ADD COLUMN "requires_review" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "public"."selection_step_templates"."requires_review" IS '採用担当者の確認が必要か（trueの場合、応募者提出後にステップを自動完了しない）';
COMMENT ON COLUMN "public"."job_steps"."requires_review" IS '採用担当者の確認が必要か';
COMMENT ON COLUMN "public"."application_steps"."requires_review" IS '採用担当者の確認が必要か';
