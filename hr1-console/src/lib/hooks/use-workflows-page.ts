"use client";

import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepo from "@/lib/repositories/workflow-repository";
import type { WorkflowRequest, WorkflowRule } from "@/types/database";

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useWorkflowEmployees() {
  const { organization } = useOrg();
  return useQuery<Employee[]>(organization ? `employees-list-${organization.id}` : null, async () =>
    workflowRepo.fetchEmployees(getSupabase(), organization!.id)
  );
}

export function useWorkflowRequests(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<WorkflowRequest[]>(
    organization && enabled ? `workflow-requests-${organization.id}` : null,
    async () => workflowRepo.fetchRequests(getSupabase(), organization!.id)
  );
}

export function useWorkflowRules(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<WorkflowRule[]>(
    organization && enabled ? `workflow-rules-${organization.id}` : null,
    async () => workflowRepo.fetchRules(getSupabase(), organization!.id)
  );
}

export async function reviewRequest(
  requestId: string,
  status: "approved" | "rejected",
  requestType: string,
  reviewComment: string | null
) {
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (status === "approved" && requestType === "paid_leave") {
    const { data: result } = await workflowRepo.approveLeaveRequest(
      client,
      requestId,
      user?.id ?? "",
      reviewComment
    );
    if (result?.error) {
      return { error: result.error as string };
    }
  } else {
    await workflowRepo.updateRequestStatus(client, requestId, {
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_comment: reviewComment,
      updated_at: new Date().toISOString(),
    });
  }

  return { error: null };
}

export async function sendReviewNotification(params: {
  organizationId: string;
  userId: string;
  status: "approved" | "rejected";
  typeLabel: string;
  reviewComment: string;
}) {
  const client = getSupabase();
  await workflowRepo.insertNotification(client, {
    organization_id: params.organizationId,
    user_id: params.userId,
    type: "general",
    title: params.status === "approved" ? "申請が承認されました" : "申請が却下されました",
    body:
      params.status === "approved"
        ? `${params.typeLabel}の申請が承認されました。`
        : `${params.typeLabel}の申請が却下されました。${params.reviewComment ? `理由: ${params.reviewComment}` : ""}`,
    is_read: false,
    action_url: "/workflow",
  });
}

export async function saveWorkflowSettings(params: {
  organizationId: string;
  rules: WorkflowRule[];
  upserts: {
    organization_id: string;
    request_type: string;
    rule_type: string;
    conditions: Record<string, unknown>;
    is_active: boolean;
  }[];
}) {
  const client = getSupabase();
  for (const upsert of params.upserts) {
    const existing = params.rules.find(
      (r) => r.request_type === upsert.request_type && r.rule_type === upsert.rule_type
    );
    await workflowRepo.upsertRule(client, existing?.id ?? null, upsert);
  }
}
