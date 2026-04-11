-- ========================================================================
-- job_steps / application_steps の polymorphic related_id を解消
--
-- 問題: 1 列 related_id (uuid) で custom_forms と interviews 両方を参照していた。
--   * step_type='form'/'screening' → custom_forms
--   * step_type='interview' → interviews または custom_forms (不整合)
--   * step_type='external_test'/'offer' → NULL
-- FK 制約が無く、孤立 ID 発生のリスクと参照先の不明確さがあった。
--
-- 解決: 2 つの専用 FK 列 form_id (custom_forms) / interview_id (interviews)
-- に分割。step_type は表示分類用としてそのまま残す。
-- ========================================================================

-- ================================================================
-- 1. 新しい FK 列を追加 (job_steps / application_steps)
--    custom_forms.id / interviews.id は text 型なので text で揃える
-- ================================================================
ALTER TABLE public.job_steps
  ADD COLUMN form_id text REFERENCES public.custom_forms(id) ON DELETE SET NULL,
  ADD COLUMN interview_id text REFERENCES public.interviews(id) ON DELETE SET NULL;

ALTER TABLE public.application_steps
  ADD COLUMN form_id text REFERENCES public.custom_forms(id) ON DELETE SET NULL,
  ADD COLUMN interview_id text REFERENCES public.interviews(id) ON DELETE SET NULL;

-- ================================================================
-- 2. 既存データを related_id から移行
--    custom_forms に存在する → form_id
--    interviews に存在する → interview_id
-- ================================================================
UPDATE public.job_steps
SET form_id = related_id
WHERE related_id IS NOT NULL
  AND related_id IN (SELECT id FROM public.custom_forms);

UPDATE public.job_steps
SET interview_id = related_id
WHERE related_id IS NOT NULL
  AND related_id IN (SELECT id FROM public.interviews);

UPDATE public.application_steps
SET form_id = related_id
WHERE related_id IS NOT NULL
  AND related_id IN (SELECT id FROM public.custom_forms);

UPDATE public.application_steps
SET interview_id = related_id
WHERE related_id IS NOT NULL
  AND related_id IN (SELECT id FROM public.interviews);

-- ================================================================
-- 3. 整合性 CHECK 制約 (form と interview が同時に set されるのを禁止)
-- ================================================================
ALTER TABLE public.job_steps
  ADD CONSTRAINT job_steps_ref_exclusive
  CHECK (NOT (form_id IS NOT NULL AND interview_id IS NOT NULL));

ALTER TABLE public.application_steps
  ADD CONSTRAINT application_steps_ref_exclusive
  CHECK (NOT (form_id IS NOT NULL AND interview_id IS NOT NULL));

-- ================================================================
-- 4. レガシー related_id 列を削除
-- ================================================================
ALTER TABLE public.job_steps DROP COLUMN related_id;
ALTER TABLE public.application_steps DROP COLUMN related_id;

-- ================================================================
-- 5. インデックス追加 (forms/interviews を JOIN するクエリ最適化)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_job_steps_form ON public.job_steps(form_id) WHERE form_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_steps_interview ON public.job_steps(interview_id) WHERE interview_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_steps_form ON public.application_steps(form_id) WHERE form_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_steps_interview ON public.application_steps(interview_id) WHERE interview_id IS NOT NULL;
