"use client";

import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepository from "@/lib/repositories/workflow-repository";

export function usePendingCount() {
  const { organization } = useOrg();
  return useQuery(organization ? `header-pending-${organization.id}` : null, async () => {
    return workflowRepository.countPendingRequests(getSupabase(), organization!.id);
  });
}
