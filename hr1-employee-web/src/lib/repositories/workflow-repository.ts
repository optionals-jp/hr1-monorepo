import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowRequest, WorkflowTemplate } from "@/types/database";

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
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const requests = (data ?? []) as WorkflowRequest[];
  if (requests.length === 0) return [];

  const userIds = [...new Set(requests.map((r) => r.user_id))];
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, email: p.email }])
  );

  return requests.map((r) => ({
    ...r,
    requester: profileMap.get(r.user_id) ?? undefined,
  }));
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

export async function fetchTemplates(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("workflow_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as WorkflowTemplate[];
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
