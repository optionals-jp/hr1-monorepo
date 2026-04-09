import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowRequest } from "@/types/database";

export async function fetchMyRequests(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("workflow_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as WorkflowRequest[];
}

export async function createRequest(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    request_type: WorkflowRequest["request_type"];
    request_data: Record<string, unknown>;
    reason: string | null;
  }
) {
  const { error } = await client.from("workflow_requests").insert(data);
  if (error) throw error;
}

export async function cancelRequest(client: SupabaseClient, requestId: string, userId: string) {
  const { error } = await client
    .from("workflow_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
}
