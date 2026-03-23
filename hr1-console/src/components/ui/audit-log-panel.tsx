"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase";
import { getAuditActionLabel } from "@/lib/constants";
import type { AuditLog } from "@/types/database";
import { format } from "date-fns";

interface AuditLogPanelProps {
  organizationId: string;
  tableName: string;
  recordId?: string;
  recordIds?: string[];
  filterColumn?: string;
  filterValue?: string;
}

export function AuditLogPanel({
  organizationId,
  tableName,
  recordId,
  recordIds,
  filterColumn,
  filterValue,
}: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const recordIdsKey = recordIds?.join(",") ?? "";

  useEffect(() => {
    if (!organizationId) return;
    if (recordIds && recordIds.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      let query = getSupabase()
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("table_name", tableName);

      if (recordIds) {
        query = query.in("record_id", recordIds);
      } else if (recordId) {
        query = query.eq("record_id", recordId);
      }

      if (filterColumn && filterValue) {
        query = query.eq(filterColumn, filterValue);
      }

      const { data } = await query.order("created_at", { ascending: false }).limit(50);

      setLogs(data ?? []);
      setLoading(false);
    };

    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, tableName, recordId, recordIdsKey, filterColumn, filterValue]);

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">読み込み中...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">変更履歴がありません</p>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-4 py-3 border-b last:border-0">
          <div className="shrink-0 mt-0.5">
            <Badge variant="outline" className="text-xs">
              {getAuditActionLabel(log)}
            </Badge>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {(log.metadata as Record<string, string> | null)?.summary ??
                (log.changes as Record<string, string> | null)?.summary ??
                log.action}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(log.created_at), "yyyy/MM/dd HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
