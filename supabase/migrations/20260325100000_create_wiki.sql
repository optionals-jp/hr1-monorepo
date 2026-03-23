CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text,
  parent_id uuid REFERENCES public.wiki_pages(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  updated_by text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_org ON wiki_pages(organization_id, is_published);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_category ON wiki_pages(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Org members can read published pages
DO $$ BEGIN
  CREATE POLICY "wiki_pages_select_org" ON public.wiki_pages FOR SELECT
    USING (
      organization_id IN (SELECT public.get_my_organization_ids())
      AND is_published = true
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin can see all (including drafts) and manage
DO $$ BEGIN
  CREATE POLICY "wiki_pages_all_admin" ON public.wiki_pages FOR ALL
    USING (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()))
    WITH CHECK (public.get_my_role() = 'admin' AND organization_id IN (SELECT public.get_my_organization_ids()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS set_wiki_pages_updated_at ON public.wiki_pages;
CREATE TRIGGER set_wiki_pages_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_trigger_wiki_pages ON public.wiki_pages;
CREATE TRIGGER audit_trigger_wiki_pages
  AFTER INSERT OR UPDATE OR DELETE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
