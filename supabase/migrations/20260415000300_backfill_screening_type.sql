-- 既存の書類選考ステップに screening_type のデフォルト値を設定
-- screening_type が null の場合、応募者アプリで「書類を提出する」ボタンが表示されないため
UPDATE "public"."job_steps"
    SET screening_type = 'resume'
    WHERE step_type = 'screening' AND screening_type IS NULL;

UPDATE "public"."application_steps"
    SET screening_type = 'resume'
    WHERE step_type = 'screening' AND screening_type IS NULL;

UPDATE "public"."selection_step_templates"
    SET screening_type = 'resume'
    WHERE step_type = 'screening' AND screening_type IS NULL;
