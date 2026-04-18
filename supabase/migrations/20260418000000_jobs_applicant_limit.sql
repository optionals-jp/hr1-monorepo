-- 求人に応募人数（募集定員）の制約列を追加する。
-- NULL は「上限なし（無制限）」を表す。正の整数のみを許可する。
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS applicant_limit integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_applicant_limit_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_applicant_limit_check
      CHECK (applicant_limit IS NULL OR applicant_limit > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.jobs.applicant_limit IS '募集定員（応募上限）。NULL は無制限。';
COMMENT ON COLUMN public.jobs.closing_at IS '応募締切日時。NULL は締切なし。';
