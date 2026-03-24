DO $$ BEGIN
  ALTER TABLE public.shift_schedules
    ADD CONSTRAINT shift_schedules_status_check
    CHECK (status IN ('draft', 'published'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
