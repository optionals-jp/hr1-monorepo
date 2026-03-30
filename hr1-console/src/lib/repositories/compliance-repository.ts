import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplianceAlert } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("compliance_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ComplianceAlert[];
}

export async function runCheck(client: SupabaseClient, organizationId: string) {
  return client.rpc("check_compliance_alerts", {
    p_organization_id: organizationId,
  });
}

export async function resolve(
  client: SupabaseClient,
  alertId: string,
  organizationId: string,
  resolvedBy: string | null
) {
  return client
    .from("compliance_alerts")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
    })
    .eq("id", alertId)
    .eq("organization_id", organizationId);
}
