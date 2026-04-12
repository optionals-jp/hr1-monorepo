"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useOrg } from "@/lib/org-context";
import {
  fetchAuditLogs as fetchAuditLogsAction,
  fetchProfileNames as fetchProfileNamesAction,
} from "@/lib/hooks/use-audit-logs-page";
import { exportToCSV, csvFilenameWithDate } from "@hr1/shared-ui";
import type { AuditLog } from "@/types/database";

const PAGE_SIZE = 50;

interface CursorPage {
  createdAt: string;
  id: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}/${mo}/${day} ${h}:${mi}:${s}`;
}

export function useAuditLogs() {
  const { organization } = useOrg();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const userNamesRef = useRef(userNames);
  userNamesRef.current = userNames;
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursorStack, setCursorStack] = useState<CursorPage[]>([]);
  const [currentCursor, setCurrentCursor] = useState<CursorPage | null>(null);
  const [sequenceGaps, setSequenceGaps] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(
    async (cursor: CursorPage | null) => {
      if (!organization) return;
      setIsLoading(true);
      setError(undefined);

      try {
        const { data, error: queryError } = await fetchAuditLogsAction(organization.id, {
          cursor,
          filterAction,
          filterTable,
          filterDateFrom,
          filterDateTo,
          filterUser,
          pageSize: PAGE_SIZE,
        });
        if (queryError) throw queryError;

        const rows = (data ?? []) as AuditLog[];
        const hasMore = rows.length > PAGE_SIZE;
        const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

        setLogs(pageRows);
        setHasNextPage(hasMore);

        const gaps = new Set<string>();
        for (let i = 0; i < pageRows.length - 1; i++) {
          const current = pageRows[i].sequence_number;
          const next = pageRows[i + 1].sequence_number;
          if (current - next > 1) {
            gaps.add(pageRows[i].id);
            gaps.add(pageRows[i + 1].id);
          }
        }
        setSequenceGaps(gaps);

        const userIds = [...new Set(pageRows.map((l) => l.user_id))];
        const unknownIds = userIds.filter((uid) => !userNamesRef.current[uid]);
        if (unknownIds.length > 0) {
          const newNames = await fetchProfileNamesAction(unknownIds);
          setUserNames((prev) => ({ ...prev, ...newNames }));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error("取得に失敗しました"));
      } finally {
        setIsLoading(false);
      }
    },
    [organization, filterAction, filterTable, filterDateFrom, filterDateTo, filterUser]
  );

  useEffect(() => {
    setCursorStack([]);
    setCurrentCursor(null);
    fetchLogs(null);
  }, [fetchLogs]);

  const goNextPage = () => {
    if (logs.length === 0) return;
    const lastLog = logs[logs.length - 1];
    const newCursor = { createdAt: lastLog.created_at, id: lastLog.id };
    setCursorStack((prev) => [...prev, currentCursor ?? { createdAt: "", id: "" }]);
    setCurrentCursor(newCursor);
    fetchLogs(newCursor);
  };

  const goPrevPage = () => {
    if (cursorStack.length === 0) return;
    const prev = cursorStack[cursorStack.length - 1];
    setCursorStack((s) => s.slice(0, -1));
    const cursor = prev.createdAt ? prev : null;
    setCurrentCursor(cursor);
    fetchLogs(cursor);
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const changesStr = log.changes ? JSON.stringify(log.changes).toLowerCase() : "";
    const metadataStr = log.metadata ? JSON.stringify(log.metadata).toLowerCase() : "";
    return (
      log.record_id.toLowerCase().includes(q) ||
      log.table_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (userNames[log.user_id] ?? "").toLowerCase().includes(q) ||
      changesStr.includes(q) ||
      metadataStr.includes(q)
    );
  });

  const activeFilterCount =
    (filterAction !== "all" ? 1 : 0) +
    (filterTable !== "all" ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0) +
    (filterUser ? 1 : 0);

  const clearFilters = () => {
    setFilterAction("all");
    setFilterTable("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterUser("");
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    exportToCSV(
      filteredLogs.map((l) => ({
        ...l,
        _datetime: formatDateTime(l.created_at),
        _action: l.action,
        _tableName: l.table_name,
        _recordId: l.record_id,
        _user: userNames[l.user_id] ?? l.user_id,
        _source: l.source,
        _changes: l.changes ? JSON.stringify(l.changes) : "",
        _ipAddress: l.ip_address ?? "",
        _sequenceNumber: String(l.sequence_number),
      })),
      [
        { key: "_sequenceNumber", label: "連番" },
        { key: "_datetime", label: "日時" },
        { key: "_action", label: "操作" },
        { key: "_tableName", label: "テーブル" },
        { key: "_recordId", label: "レコードID" },
        { key: "_user", label: "ユーザー" },
        { key: "_source", label: "ソース" },
        { key: "_ipAddress", label: "IPアドレス" },
        { key: "_changes", label: "変更内容" },
      ],
      csvFilenameWithDate("監査ログ")
    );
  };

  const retry = () => fetchLogs(currentCursor);

  return {
    logs,
    isLoading,
    error,
    search,
    setSearch,
    filterAction,
    setFilterAction,
    filterTable,
    setFilterTable,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterUser,
    setFilterUser,
    expandedRows,
    userNames,
    hasNextPage,
    cursorStack,
    sequenceGaps,
    filteredLogs,
    activeFilterCount,
    fetchLogs,
    goNextPage,
    goPrevPage,
    toggleExpand,
    clearFilters,
    handleExport,
    retry,
  };
}
