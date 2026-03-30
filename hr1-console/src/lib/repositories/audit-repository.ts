import type { SupabaseClient } from "@supabase/supabase-js";

interface FetchAuditLogsParams {
  organizationId: string;
  tableName: string;
  recordId?: string;
  recordIds?: string[];
  filterColumn?: string;
  filterValue?: string;
}

export async function fetchAuditLogs(client: SupabaseClient, params: FetchAuditLogsParams) {
  let query = client
    .from("audit_logs")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("table_name", params.tableName);

  if (params.recordIds) {
    query = query.in("record_id", params.recordIds);
  } else if (params.recordId) {
    query = query.eq("record_id", params.recordId);
  }

  if (params.filterColumn && params.filterValue) {
    query = query.eq(params.filterColumn, params.filterValue);
  }

  return query.order("created_at", { ascending: false }).limit(50);
}

export async function insertAuditLog(
  client: SupabaseClient,
  data: {
    organization_id: string;
    table_name: string;
    record_id: string;
    action: string;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    performed_by?: string;
  }
) {
  return client.from("audit_logs").insert(data);
}
