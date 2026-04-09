import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvaluationCycle, EvaluationAssignment } from "@/types/database";

export async function fetchActiveCycles(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("evaluation_cycles")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "closed", "finalized"])
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EvaluationCycle[];
}

export async function fetchMyAssignments(client: SupabaseClient, cycleId: string, userId: string) {
  const { data, error } = await client
    .from("evaluation_assignments")
    .select(
      "*, target_profile:target_user_id(display_name, email), evaluator_profile:evaluator_id(display_name, email)"
    )
    .eq("cycle_id", cycleId)
    .or(`target_user_id.eq.${userId},evaluator_id.eq.${userId}`)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as EvaluationAssignment[];
}
