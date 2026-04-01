import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmWebhook, CrmWebhookLog } from "@/types/database";

export async function fetchWebhooks(
  client: SupabaseClient,
  organizationId: string
): Promise<CrmWebhook[]> {
  const { data, error } = await client
    .from("crm_webhooks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CrmWebhook[];
}

export async function createWebhook(
  client: SupabaseClient,
  webhook: Omit<
    CrmWebhook,
    "id" | "created_at" | "updated_at" | "last_triggered_at" | "success_count" | "failure_count"
  >
): Promise<CrmWebhook> {
  const { data, error } = await client.from("crm_webhooks").insert(webhook).select().single();
  if (error) throw error;
  return data as CrmWebhook;
}

export async function updateWebhook(
  client: SupabaseClient,
  webhookId: string,
  organizationId: string,
  updates: Partial<Pick<CrmWebhook, "name" | "url" | "secret" | "is_active" | "events" | "headers">>
): Promise<void> {
  const { error } = await client
    .from("crm_webhooks")
    .update(updates)
    .eq("id", webhookId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteWebhook(
  client: SupabaseClient,
  webhookId: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("crm_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function fetchWebhookLogs(
  client: SupabaseClient,
  organizationId: string,
  options?: { webhookId?: string; limit?: number }
): Promise<CrmWebhookLog[]> {
  let query = client
    .from("crm_webhook_logs")
    .select("*, crm_webhooks(name)")
    .eq("organization_id", organizationId)
    .order("executed_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.webhookId) {
    query = query.eq("webhook_id", options.webhookId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmWebhookLog[];
}

export async function insertWebhookLog(
  client: SupabaseClient,
  log: Omit<CrmWebhookLog, "id" | "executed_at" | "crm_webhooks">
): Promise<void> {
  const { error } = await client.from("crm_webhook_logs").insert(log);
  if (error) throw error;
}
