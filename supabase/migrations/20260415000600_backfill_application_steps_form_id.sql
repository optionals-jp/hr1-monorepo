-- 既存の application_steps に job_steps の form_id をバックフィル
-- 応募作成時に form_id がコピーされなかった既存データを修正
UPDATE application_steps
SET form_id = sub.js_form_id
FROM (
  SELECT a_s.id AS as_id, js.form_id AS js_form_id
  FROM application_steps a_s
  JOIN applications a ON a.id = a_s.application_id
  JOIN job_steps js ON js.job_id = a.job_id
    AND js.step_order = a_s.step_order
    AND js.step_type = a_s.step_type
  WHERE a_s.form_id IS NULL
    AND js.form_id IS NOT NULL
) sub
WHERE application_steps.id = sub.as_id;
