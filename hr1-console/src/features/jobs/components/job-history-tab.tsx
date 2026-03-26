"use client";

import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/types/database";
import { format } from "date-fns";
import { getAuditActionLabel } from "@/lib/constants";

interface JobHistoryTabProps {
  changeLogs: AuditLog[];
}

export function JobHistoryTab({ changeLogs }: JobHistoryTabProps) {
  if (changeLogs.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">編集履歴がありません</p>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {changeLogs.map((log) => (
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
