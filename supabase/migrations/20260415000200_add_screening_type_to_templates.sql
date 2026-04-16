ALTER TABLE "public"."selection_step_templates"
    ADD COLUMN "screening_type" "text";

DO $$ BEGIN
  ALTER TABLE "public"."selection_step_templates"
    ADD CONSTRAINT "sst_screening_type_check"
    CHECK (screening_type IS NULL OR screening_type IN ('resume', 'cv', 'portfolio', 'entry_sheet', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN "public"."selection_step_templates"."screening_type" IS '書類種類（step_type=screeningの場合に設定）: resume=履歴書, cv=職務経歴書, portfolio=ポートフォリオ, entry_sheet=エントリーシート, other=その他';
