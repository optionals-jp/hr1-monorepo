import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowRequest, WorkflowRule, WorkflowTemplate } from "@/types/database";

export async function countPendingRequests(client: SupabaseClient, organizationId: string) {
  const { count } = await client
    .from("workflow_requests")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  return count ?? 0;
}

export async function fetchEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select(
      "user_id, profiles!user_organizations_user_id_fkey(id, email, display_name, avatar_url)"
    )
    .eq("organization_id", organizationId);
  return (data ?? []).map((d) => {
    const p = d.profiles as unknown as {
      id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    return { id: p.id, email: p.email, display_name: p.display_name, avatar_url: p.avatar_url };
  });
}

export async function fetchRequests(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("workflow_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as WorkflowRequest[];
}

export async function fetchRules(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("workflow_rules")
    .select("*")
    .eq("organization_id", organizationId);
  return (data ?? []) as WorkflowRule[];
}

export async function approveLeaveRequest(
  client: SupabaseClient,
  requestId: string,
  reviewerId: string,
  comment: string | null
) {
  return client.rpc("approve_leave_request", {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
    p_comment: comment,
  });
}

export async function updateRequestStatus(
  client: SupabaseClient,
  requestId: string,
  organizationId: string,
  data: {
    status: string;
    reviewed_by: string | null;
    reviewed_at: string;
    review_comment: string | null;
    updated_at: string;
  }
) {
  return client
    .from("workflow_requests")
    .update(data)
    .eq("id", requestId)
    .eq("organization_id", organizationId);
}

export async function insertNotification(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    is_read: boolean;
    action_url?: string;
  }
) {
  return client.from("notifications").insert(data);
}

export async function upsertRule(
  client: SupabaseClient,
  existingId: string | null,
  data: {
    organization_id: string;
    request_type: string;
    rule_type: string;
    conditions: Record<string, unknown>;
    is_active: boolean;
  }
) {
  if (existingId) {
    return client
      .from("workflow_rules")
      .update({ conditions: data.conditions, is_active: data.is_active })
      .eq("id", existingId)
      .eq("organization_id", data.organization_id);
  }
  return client.from("workflow_rules").insert(data);
}

// --- Workflow Templates ---

export async function fetchTemplates(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("workflow_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order")
    .order("name");
  return (data ?? []) as WorkflowTemplate[];
}

export async function createTemplate(
  client: SupabaseClient,
  data: {
    organization_id: string;
    name: string;
    description: string | null;
    icon: string;
    fields: unknown[];
    is_active: boolean;
    sort_order: number;
  }
) {
  return client.from("workflow_templates").insert(data).select().single();
}

export async function updateTemplate(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: {
    name: string;
    description: string | null;
    icon: string;
    fields: unknown[];
    is_active: boolean;
  }
) {
  return client
    .from("workflow_templates")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function deleteTemplate(client: SupabaseClient, id: string, organizationId: string) {
  return client
    .from("workflow_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
}

// --- Audit logs page ---

export async function fetchAuditLogs(
  client: SupabaseClient,
  organizationId: string,
  params: {
    cursor: { createdAt: string; id: string } | null;
    filterAction: string;
    filterTable: string;
    filterDateFrom: string;
    filterDateTo: string;
    filterUser: string;
    pageSize: number;
  }
) {
  let query = client
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(params.pageSize + 1);

  if (params.cursor) {
    query = query.or(
      `created_at.lt.${params.cursor.createdAt},and(created_at.eq.${params.cursor.createdAt},id.lt.${params.cursor.id})`
    );
  }
  if (params.filterAction !== "all") {
    query = query.eq("action", params.filterAction);
  }
  if (params.filterTable !== "all") {
    query = query.eq("table_name", params.filterTable);
  }
  if (params.filterDateFrom) {
    query = query.gte("created_at", `${params.filterDateFrom}T00:00:00`);
  }
  if (params.filterDateTo) {
    query = query.lte("created_at", `${params.filterDateTo}T23:59:59`);
  }
  if (params.filterUser) {
    query = query.eq("user_id", params.filterUser);
  }

  return query;
}

export async function fetchProfileNames(client: SupabaseClient, userIds: string[]) {
  const { data } = await client
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);
  const names: Record<string, string> = {};
  if (data) {
    for (const p of data) {
      names[p.id] = p.display_name || p.email;
    }
  }
  return names;
}
