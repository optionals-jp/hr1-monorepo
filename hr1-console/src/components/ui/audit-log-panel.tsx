"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAuditLogsByRecord } from "@/lib/hooks/use-audit-log-panel";
import { getAuditActionLabel } from "@/lib/constants";
import type { AuditLog } from "@/types/database";
import type { AuditFilterColumn } from "@/lib/repositories/audit-repository";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

/** アクション種別に応じたアイコンとカラーを返す */
function getActionStyle(action: string) {
  switch (action) {
    case "create":
      return { icon: Plus, bg: "bg-green-500", text: "text-green-700", bgLight: "bg-green-50" };
    case "delete":
      return { icon: Trash2, bg: "bg-red-500", text: "text-red-700", bgLight: "bg-red-50" };
    case "update":
    default:
      return { icon: Pencil, bg: "bg-blue-500", text: "text-blue-700", bgLight: "bg-blue-50" };
  }
}

interface AuditLogPanelProps {
  organizationId: string;
  tableName: string;
  recordId?: string;
  recordIds?: string[];
  filterColumn?: AuditFilterColumn;
  filterValue?: string;
  /** ログ取得完了時に件数を通知するコールバック */
  onLoaded?: (count: number) => void;
  /** 値が変わるとログを再取得する */
  refreshKey?: number;
}

export function AuditLogPanel({
  organizationId,
  tableName,
  recordId,
  recordIds,
  filterColumn,
  filterValue,
  onLoaded,
  refreshKey,
}: AuditLogPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const recordIdsKey = recordIds?.join(",") ?? "";

  useEffect(() => {
    if (!organizationId) return;
    if (recordIds && recordIds.length === 0) {
      setLogs([]);
      setLoading(false);
      onLoadedRef.current?.(0);
      return;
    }

    const fetchLogs = async () => {
      setLoading(true);
      const { data } = await fetchAuditLogsByRecord({
        organizationId,
        tableName,
        recordId,
        recordIds,
        filterColumn,
        filterValue,
      });
      const result = data ?? [];
      setLogs(result);
      setLoading(false);
      onLoadedRef.current?.(result.length);
    };

    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, tableName, recordId, recordIdsKey, filterColumn, filterValue, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        読み込み中...
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-center py-12 text-sm text-muted-foreground">変更ログがありません</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="relative">
        {logs.map((log, i) => {
          const style = getActionStyle(log.action);
          const Icon = style.icon;
          const isLast = i === logs.length - 1;
          const summary =
            (log.metadata as Record<string, string> | null)?.summary ??
            (log.changes as Record<string, string> | null)?.summary ??
            log.action;
          const dateObj = new Date(log.created_at);

          return (
            <div key={log.id} className="relative flex gap-3 pb-0">
              {/* タイムラインの縦線 */}
              <div className="flex flex-col items-center">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
              </div>

              {/* 内容 */}
              <div className={`flex-1 pb-5 ${isLast ? "" : "min-h-14"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm leading-6">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${style.bgLight} ${style.text} mr-1.5`}
                    >
                      {getAuditActionLabel(log)}
                    </span>
                    <span className="text-foreground">{summary}</span>
                  </p>
                  <time
                    className="shrink-0 text-xs text-muted-foreground whitespace-nowrap"
                    title={format(dateObj, "yyyy/MM/dd HH:mm:ss")}
                  >
                    {formatDistanceToNow(dateObj, { addSuffix: true, locale: ja })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
