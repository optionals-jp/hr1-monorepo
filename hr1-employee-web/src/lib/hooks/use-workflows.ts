"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepo from "@/lib/repositories/workflow-repository";
import * as notificationRepo from "@/lib/repositories/notification-repository";
import type { WorkflowRequest, WorkflowTemplate } from "@/types/database";

export function useMyWorkflows() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `my-workflows-${organization.id}-${user.id}` : null;

  const result = useQuery<WorkflowRequest[]>(key, () =>
    workflowRepo.fetchMyRequests(getSupabase(), organization!.id, user!.id)
  );

  const createRequest = async (
    requestType: WorkflowRequest["request_type"],
    requestData: Record<string, unknown>,
    reason: string | null
  ) => {
    await workflowRepo.createRequest(getSupabase(), {
      organization_id: organization!.id,
      user_id: user!.id,
      request_type: requestType,
      request_data: requestData,
      reason,
    });
    result.mutate();
  };

  const cancelRequest = async (requestId: string) => {
    await workflowRepo.cancelRequest(getSupabase(), requestId, user!.id);
    result.mutate();
  };

  return { ...result, createRequest, cancelRequest };
}

export function useWorkflowTemplates() {
  return useOrgQuery<WorkflowTemplate[]>("workflow-templates", (orgId) =>
    workflowRepo.fetchTemplates(getSupabase(), orgId)
  );
}

export function usePendingApprovals() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `pending-approvals-${organization.id}` : null;

  const result = useQuery<
    (WorkflowRequest & { requester?: { display_name: string | null; email: string } })[]
  >(key, () => workflowRepo.fetchPendingRequests(getSupabase(), organization!.id));

  const reviewRequest = async (
    requestId: string,
    requestType: string,
    status: "approved" | "rejected",
    comment: string | null
  ) => {
    // 対象申請の申請者IDを取得
    const target = result.data?.find((r) => r.id === requestId);

    if (requestType === "paid_leave" && status === "approved") {
      await workflowRepo.approveLeaveRequest(getSupabase(), requestId, user!.id, comment);
    } else {
      await workflowRepo.reviewRequest(getSupabase(), requestId, user!.id, status, comment);
    }

    // 申請者に通知を送信
    if (target && organization) {
      try {
        const statusLabel = status === "approved" ? "承認" : "却下";
        await notificationRepo.createNotification(getSupabase(), {
          user_id: target.user_id,
          organization_id: organization.id,
          title: `申請が${statusLabel}されました`,
          body: comment ? `コメント: ${comment}` : `あなたの申請が${statusLabel}されました。`,
          type: "workflow",
          resource_type: "workflow_request",
          resource_id: requestId,
        });
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
    }

    result.mutate();
  };

  return { ...result, reviewRequest };
}
