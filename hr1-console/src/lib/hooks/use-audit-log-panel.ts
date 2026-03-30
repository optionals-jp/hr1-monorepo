"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as auditRepository from "@/lib/repositories/audit-repository";

export async function fetchAuditLogsByRecord(params: {
  organizationId: string;
  tableName: string;
  recordId?: string;
  recordIds?: string[];
  filterColumn?: string;
  filterValue?: string;
}) {
  return auditRepository.fetchAuditLogs(getSupabase(), params);
}
