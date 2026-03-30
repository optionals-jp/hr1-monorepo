"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepo from "@/lib/repositories/workflow-repository";

interface CursorPage {
  createdAt: string;
  id: string;
}

export async function fetchAuditLogs(
  organizationId: string,
  params: {
    cursor: CursorPage | null;
    filterAction: string;
    filterTable: string;
    filterDateFrom: string;
    filterDateTo: string;
    filterUser: string;
    pageSize: number;
  }
) {
  return workflowRepo.fetchAuditLogs(getSupabase(), organizationId, params);
}

export async function fetchProfileNames(userIds: string[]) {
  return workflowRepo.fetchProfileNames(getSupabase(), userIds);
}
