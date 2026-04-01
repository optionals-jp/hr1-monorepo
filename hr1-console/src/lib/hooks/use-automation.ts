import { useOrgQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/automation-repository";
import type { CrmAutomationRule } from "@/types/database";

export function useAutomationRules() {
  return useOrgQuery("crm-automation-rules", (orgId) => repo.fetchRules(getSupabase(), orgId));
}

export function useAutomationLogs(ruleId?: string) {
  return useOrgQuery(ruleId ? `crm-automation-logs-${ruleId}` : "crm-automation-logs", (orgId) =>
    repo.fetchLogs(getSupabase(), orgId, { ruleId })
  );
}

export type { CrmAutomationRule };
