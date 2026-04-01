ALTER TABLE public.bc_activities
  ADD CONSTRAINT bc_activities_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
