-- 活動・TODOをリードにも紐付け可能にする
ALTER TABLE public.bc_activities
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.bc_leads(id) ON DELETE SET NULL;

ALTER TABLE public.bc_todos
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.bc_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bc_activities_lead ON public.bc_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_bc_todos_lead ON public.bc_todos(lead_id);

COMMENT ON COLUMN public.bc_activities.lead_id IS 'リードに紐づく活動（商談化前の電話・メール等）';
COMMENT ON COLUMN public.bc_todos.lead_id IS 'リードに紐づくTODO（フォローアップ予定等）';
