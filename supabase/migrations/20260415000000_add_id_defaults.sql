-- applications.id と application_steps.id にデフォルト値を追加
-- Dart側がIDを指定せずにINSERTするため、DB側で自動生成する

ALTER TABLE "public"."applications"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "public"."application_steps"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
