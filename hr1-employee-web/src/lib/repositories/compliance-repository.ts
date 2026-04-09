import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComplianceAlert } from "@/types/database";

export async function fetchMyAlerts(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("compliance_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ComplianceAlert[];
}
