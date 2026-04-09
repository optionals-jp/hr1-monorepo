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

export async function fetchPendingRequests(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("workflow_requests")
    .select("*, requester:user_id(display_name, email)")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as (WorkflowRequest & {
    requester?: { display_name: string | null; email: string };
  })[];
}

export async function reviewRequest(
  client: SupabaseClient,
  requestId: string,
  reviewerId: string,
  status: "approved" | "rejected",
  comment: string | null
) {
  const { error } = await client
    .from("workflow_requests")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_comment: comment,
    })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function approveLeaveRequest(
  client: SupabaseClient,
  requestId: string,
  reviewerId: string,
  comment: string | null
) {
  const { data, error } = await client.rpc("approve_leave_request", {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
    p_comment: comment,
  });
  if (error) throw error;
  return data;
}
