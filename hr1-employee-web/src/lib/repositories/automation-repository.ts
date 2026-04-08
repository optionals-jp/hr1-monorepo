import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmAutomationRule, CrmAutomationLog, CrmAutomationAction } from "@/types/database";

// ── ルール CRUD ──

export async function fetchRules(
  client: SupabaseClient,
  organizationId: string
): Promise<CrmAutomationRule[]> {
  const { data, error } = await client
    .from("crm_automation_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CrmAutomationRule[];
}

export async function fetchRule(
  client: SupabaseClient,
  ruleId: string,
  organizationId: string
): Promise<CrmAutomationRule> {
  const { data, error } = await client
    .from("crm_automation_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data as CrmAutomationRule;
}

export async function createRule(
  client: SupabaseClient,
  rule: Omit<CrmAutomationRule, "id" | "created_at" | "updated_at">
): Promise<CrmAutomationRule> {
  const { data, error } = await client.from("crm_automation_rules").insert(rule).select().single();
  if (error) throw error;
  return data as CrmAutomationRule;
}

export async function updateRule(
  client: SupabaseClient,
  ruleId: string,
  organizationId: string,
  updates: Partial<
    Pick<
      CrmAutomationRule,
      | "name"
      | "description"
      | "is_active"
      | "trigger_type"
      | "conditions"
      | "actions"
      | "sort_order"
    >
  >
): Promise<void> {
  const { error } = await client
    .from("crm_automation_rules")
    .update(updates)
    .eq("id", ruleId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteRule(
  client: SupabaseClient,
  ruleId: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("crm_automation_rules")
    .delete()
    .eq("id", ruleId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function toggleRuleActive(
  client: SupabaseClient,
  ruleId: string,
  organizationId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await client
    .from("crm_automation_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

// ── ルール実行ログ ──

export async function fetchLogs(
  client: SupabaseClient,
  organizationId: string,
  options?: { ruleId?: string; limit?: number }
): Promise<CrmAutomationLog[]> {
  let query = client
    .from("crm_automation_logs")
    .select("*, crm_automation_rules(name)")
    .eq("organization_id", organizationId)
    .order("executed_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.ruleId) {
    query = query.eq("rule_id", options.ruleId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CrmAutomationLog[];
}

export async function insertLog(
  client: SupabaseClient,
  log: {
    organization_id: string;
    rule_id: string;
    trigger_type: string;
    entity_type: string;
    entity_id: string;
    actions_executed: CrmAutomationAction[];
    status: "success" | "partial" | "failed";
    error_message?: string;
  }
): Promise<void> {
  const { error } = await client.from("crm_automation_logs").insert(log);
  if (error) throw error;
}

// ── アクティブルール取得（トリガー別） ──

export async function fetchActiveRulesByTrigger(
  client: SupabaseClient,
  organizationId: string,
  triggerType: string
): Promise<CrmAutomationRule[]> {
  const { data, error } = await client
    .from("crm_automation_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CrmAutomationRule[];
}
