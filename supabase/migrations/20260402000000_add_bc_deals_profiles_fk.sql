-- bc_deals.assigned_to → profiles へのFK追加（profiles JOINを可能にする）
ALTER TABLE public.bc_deals
  ADD CONSTRAINT bc_deals_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
