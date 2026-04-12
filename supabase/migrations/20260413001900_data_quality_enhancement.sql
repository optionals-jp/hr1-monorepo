-- =============================================================================
-- Phase 2: データ品質向上
-- F1: 応募経路 (source), F2: 不採用理由 (rejection), F3: 面接官アサイン
-- =============================================================================

-- ---------------------------------------------------------------------------
-- F1: applications.source（応募経路）
-- ---------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS source text;

DO $$ BEGIN
  ALTER TABLE public.applications
    ADD CONSTRAINT applications_source_check
    CHECK (source IS NULL OR source IN ('app', 'referral', 'agency', 'job_board', 'direct', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.applications.source IS '応募経路: app=自社アプリ, referral=リファラル, agency=人材紹介, job_board=求人媒体, direct=直接応募, other=その他';

-- ---------------------------------------------------------------------------
-- F2: applications.rejection_reason, rejection_category（不採用理由）
-- ---------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rejection_category text;

DO $$ BEGIN
  ALTER TABLE public.applications
    ADD CONSTRAINT applications_rejection_category_check
    CHECK (rejection_category IS NULL OR rejection_category IN ('skill_mismatch', 'culture_mismatch', 'experience_lack', 'salary_mismatch', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.applications.rejection_reason IS '不採用理由（自由記述、社内限定）';
COMMENT ON COLUMN public.applications.rejection_category IS '不採用カテゴリ';

-- ---------------------------------------------------------------------------
-- F3: interviews.interviewer_ids（面接官）
-- ---------------------------------------------------------------------------
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interviewer_ids text[] DEFAULT '{}';

COMMENT ON COLUMN public.interviews.interviewer_ids IS '面接官のprofiles.id配列';
