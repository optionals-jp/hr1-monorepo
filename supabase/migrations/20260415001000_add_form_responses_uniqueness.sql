-- 既存の重複データをクリーンアップ（最新の submitted_at を残す）
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY form_id, applicant_id, field_id
    ORDER BY submitted_at DESC, id DESC
  ) AS rn
  FROM form_responses
  WHERE applicant_id IS NOT NULL
)
DELETE FROM form_responses WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- UNIQUE 制約を追加（同一応募者の同一フォーム・フィールドに対して1回答のみ）
ALTER TABLE "public"."form_responses"
  ADD CONSTRAINT "form_responses_unique_response"
  UNIQUE ("form_id", "applicant_id", "field_id");
