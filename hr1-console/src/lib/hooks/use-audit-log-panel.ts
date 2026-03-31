"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as auditRepository from "@/lib/repositories/audit-repository";
import type { AuditFilterColumn } from "@/lib/repositories/audit-repository";

export async function fetchAuditLogsByRecord(params: {
  organizationId: string;
  tableName: string;
  recordId?: string;
  recordIds?: string[];
  filterColumn?: AuditFilterColumn;
  filterValue?: string;
}) {
  return auditRepository.fetchAuditLogs(getSupabase(), params);
}
