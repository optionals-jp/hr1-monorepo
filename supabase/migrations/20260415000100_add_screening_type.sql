-- 書類選考ステップの書類種類を指定するカラムを追加
-- step_type = 'screening' の場合に必須

ALTER TABLE "public"."job_steps"
    ADD COLUMN "screening_type" "text";

ALTER TABLE "public"."application_steps"
    ADD COLUMN "screening_type" "text";

DO $$ BEGIN
  ALTER TABLE "public"."job_steps"
    ADD CONSTRAINT "job_steps_screening_type_check"
    CHECK (screening_type IS NULL OR screening_type IN ('resume', 'cv', 'portfolio', 'entry_sheet', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."application_steps"
    ADD CONSTRAINT "app_steps_screening_type_check"
    CHECK (screening_type IS NULL OR screening_type IN ('resume', 'cv', 'portfolio', 'entry_sheet', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN "public"."job_steps"."screening_type" IS '書類種類: resume=履歴書, cv=職務経歴書, portfolio=ポートフォリオ, entry_sheet=エントリーシート, other=その他';
COMMENT ON COLUMN "public"."application_steps"."screening_type" IS '書類種類（job_stepsからコピー）';
