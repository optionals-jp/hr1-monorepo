CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'employee', 'applicant')),
  published_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_org_published ON announcements(organization_id, published_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Org members can read published announcements
DO $$ BEGIN
  CREATE POLICY "announcements_select_org" ON public.announcements FOR SELECT
    USING (
      organization_id IN (SELECT public.get_my_organization_ids())
      AND published_at IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin full access
DO $$ BEGIN
  CREATE POLICY "announcements_all_admin" ON public.announcements FOR ALL
    USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
    WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
DROP TRIGGER IF EXISTS audit_trigger_announcements ON public.announcements;
CREATE TRIGGER audit_trigger_announcements
  AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
