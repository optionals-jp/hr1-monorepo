import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/email-template-repository";

export function useEmailTemplates() {
  return useOrgQuery("crm-email-templates", (orgId) => repo.fetchTemplates(getSupabase(), orgId));
}
