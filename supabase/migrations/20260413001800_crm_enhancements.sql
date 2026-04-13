-- CRM Enhancement: Fix automation notification type + Add comments table + Duplicate detection

-- 1. Fix notifications.type CHECK constraint to include crm_automation
DO $$
BEGIN
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('survey_request', 'task_assigned', 'recruitment_update',
      'attendance_reminder', 'message_received', 'announcement', 'general',
      'crm_automation', 'crm_comment'));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 2. Create crm_comments table for deal/entity comments with @mentions
CREATE TABLE IF NOT EXISTS crm_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('deal', 'company', 'contact', 'lead')),
  entity_id uuid NOT NULL,
  author_id text NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  mentions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_comments_entity
  ON crm_comments (organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_comments_author
  ON crm_comments (author_id);

ALTER TABLE crm_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_select') THEN
    CREATE POLICY crm_comments_select ON crm_comments FOR SELECT TO authenticated
      USING (organization_id = public.get_my_organization_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_insert') THEN
    CREATE POLICY crm_comments_insert ON crm_comments FOR INSERT TO authenticated
      WITH CHECK (organization_id = public.get_my_organization_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_update') THEN
    CREATE POLICY crm_comments_update ON crm_comments FOR UPDATE TO authenticated
      USING (organization_id = public.get_my_organization_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crm_comments_delete') THEN
    CREATE POLICY crm_comments_delete ON crm_comments FOR DELETE TO authenticated
      USING (organization_id = public.get_my_organization_id());
  END IF;
END $$;

CREATE OR REPLACE TRIGGER set_crm_comments_updated_at
  BEFORE UPDATE ON crm_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Enable pg_trgm for duplicate detection
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. Add trigram indexes for duplicate detection
CREATE INDEX IF NOT EXISTS idx_crm_companies_name_trgm
  ON crm_companies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name_kana_trgm
  ON crm_companies USING gin (name_kana gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_lower
  ON crm_contacts ((lower(email))) WHERE email IS NOT NULL;

-- 5. Postgres function for company duplicate detection
CREATE OR REPLACE FUNCTION public.crm_find_similar_companies(
  p_org_id text,
  p_name text,
  p_corporate_number text DEFAULT NULL,
  p_threshold numeric DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  name text,
  name_kana text,
  corporate_number text,
  similarity_score numeric,
  match_type text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    -- Exact corporate number match (highest priority)
    SELECT c.id, c.name, c.name_kana, c.corporate_number,
           1.0::numeric AS similarity_score,
           'corporate_number'::text AS match_type
    FROM crm_companies c
    WHERE c.organization_id = p_org_id
      AND p_corporate_number IS NOT NULL
      AND c.corporate_number = p_corporate_number
    UNION ALL
    -- Trigram name similarity
    SELECT c.id, c.name, c.name_kana, c.corporate_number,
           similarity(c.name, p_name)::numeric AS similarity_score,
           'name_similarity'::text AS match_type
    FROM crm_companies c
    WHERE c.organization_id = p_org_id
      AND similarity(c.name, p_name) > p_threshold
    UNION ALL
    -- Kana similarity (if available)
    SELECT c.id, c.name, c.name_kana, c.corporate_number,
           similarity(c.name_kana, p_name)::numeric AS similarity_score,
           'kana_similarity'::text AS match_type
    FROM crm_companies c
    WHERE c.organization_id = p_org_id
      AND c.name_kana IS NOT NULL
      AND similarity(c.name_kana, p_name) > p_threshold
    ORDER BY similarity_score DESC
    LIMIT 10;
END;
$$;

-- 6. Postgres function for contact duplicate detection
CREATE OR REPLACE FUNCTION public.crm_find_similar_contacts(
  p_org_id text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_first_name text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  last_name text,
  first_name text,
  email text,
  phone text,
  company_name text,
  match_type text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    -- Exact email match
    SELECT c.id, c.last_name, c.first_name, c.email, c.phone,
           co.name AS company_name,
           'email'::text AS match_type
    FROM crm_contacts c
    LEFT JOIN crm_companies co ON co.id = c.company_id
    WHERE c.organization_id = p_org_id
      AND p_email IS NOT NULL
      AND lower(c.email) = lower(p_email)
    UNION ALL
    -- Exact phone match (normalized)
    SELECT c.id, c.last_name, c.first_name, c.email, c.phone,
           co.name AS company_name,
           'phone'::text AS match_type
    FROM crm_contacts c
    LEFT JOIN crm_companies co ON co.id = c.company_id
    WHERE c.organization_id = p_org_id
      AND p_phone IS NOT NULL
      AND regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
    UNION ALL
    -- Name similarity
    SELECT c.id, c.last_name, c.first_name, c.email, c.phone,
           co.name AS company_name,
           'name'::text AS match_type
    FROM crm_contacts c
    LEFT JOIN crm_companies co ON co.id = c.company_id
    WHERE c.organization_id = p_org_id
      AND p_last_name IS NOT NULL
      AND c.last_name = p_last_name
      AND (p_first_name IS NULL OR c.first_name = p_first_name)
    ORDER BY match_type
    LIMIT 10;
END;
$$;
