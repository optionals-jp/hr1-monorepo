import { useOrgQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/webhook-repository";

export function useWebhooks() {
  return useOrgQuery("crm-webhooks", (orgId) => repo.fetchWebhooks(getSupabase(), orgId));
}

export function useWebhookLogs(webhookId?: string) {
  return useOrgQuery(webhookId ? `crm-webhook-logs-${webhookId}` : "crm-webhook-logs", (orgId) =>
    repo.fetchWebhookLogs(getSupabase(), orgId, { webhookId })
  );
}
