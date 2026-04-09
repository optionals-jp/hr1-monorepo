"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepo from "@/lib/repositories/workflow-repository";
import type { WorkflowRequest } from "@/types/database";

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
