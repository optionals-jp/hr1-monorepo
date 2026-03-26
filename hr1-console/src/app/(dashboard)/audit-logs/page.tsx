"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";
import type { AuditLog } from "@/types/database";
import {
  Download,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "create", label: "作成" },
  { value: "update", label: "更新" },
  { value: "delete", label: "削除" },
];

const TABLE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "jobs", label: "jobs" },
  { value: "applications", label: "applications" },
  { value: "interviews", label: "interviews" },
  { value: "custom_forms", label: "custom_forms" },
  { value: "evaluation_templates", label: "evaluation_templates" },
  { value: "evaluation_cycles", label: "evaluation_cycles" },
  { value: "workflow_requests", label: "workflow_requests" },
  { value: "attendance_records", label: "attendance_records" },
  { value: "profiles", label: "profiles" },
  { value: "payslips", label: "payslips" },
  { value: "leave_balances", label: "leave_balances" },
  { value: "user_organizations", label: "user_organizations" },
  { value: "departments", label: "departments" },
];

function actionBadge(action: string) {
  switch (action) {
    case "create":
      return <Badge variant="default">作成</Badge>;
    case "update":
      return <Badge variant="secondary">更新</Badge>;
    case "delete":
      return <Badge variant="destructive">削除</Badge>;
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
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

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 8) + "...";
}

interface CursorPage {
  createdAt: string;
  id: string;
}

export default function AuditLogsPage() {
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
        let query = getSupabase()
          .from("audit_logs")
          .select("*")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(PAGE_SIZE + 1);

        if (cursor) {
          query = query.or(
            `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
          );
        }

        if (filterAction !== "all") {
          query = query.eq("action", filterAction);
        }
        if (filterTable !== "all") {
          query = query.eq("table_name", filterTable);
        }
        if (filterDateFrom) {
          query = query.gte("created_at", `${filterDateFrom}T00:00:00`);
        }
        if (filterDateTo) {
          query = query.lte("created_at", `${filterDateTo}T23:59:59`);
        }
        if (filterUser) {
          query = query.eq("user_id", filterUser);
        }

        const { data, error: queryError } = await query;
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
        const unknownIds = userIds.filter((uid) => !userNames[uid]);
        if (unknownIds.length > 0) {
          const { data: profiles } = await getSupabase()
            .from("profiles")
            .select("id, display_name, email")
            .in("id", unknownIds);
          if (profiles) {
            const newNames: Record<string, string> = {};
            for (const p of profiles) {
              newNames[p.id] = p.display_name || p.email;
            }
            setUserNames((prev) => ({ ...prev, ...newNames }));
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error("取得に失敗しました"));
      } finally {
        setIsLoading(false);
      }
    },
    [organization, filterAction, filterTable, filterDateFrom, filterDateTo, filterUser, userNames]
  );

  useEffect(() => {
    setCursorStack([]);
    setCurrentCursor(null);
    fetchLogs(null);
  }, [organization, filterAction, filterTable, filterDateFrom, filterDateTo, filterUser]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => fetchLogs(currentCursor)} />
      <PageHeader
        title="監査ログ"
        description="組織全体の操作履歴"
        sticky={false}
        border={false}
        action={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV出力
          </Button>
        }
      />

      <div className="sticky top-14 z-10">
        <SearchBar value={search} onChange={setSearch} placeholder="変更内容・レコードID等で検索" />
        <div className="flex items-center gap-2 w-full bg-white border-b px-4 sm:px-6 md:px-8 py-2 overflow-x-auto">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>

          <Select value={filterAction} onValueChange={(v) => setFilterAction(v ?? "all")}>
            <SelectTrigger size="sm">
              <SelectValue>
                {(v: string) => ACTION_OPTIONS.find((o) => o.value === v)?.label ?? v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTable} onValueChange={(v) => setFilterTable(v ?? "all")}>
            <SelectTrigger size="sm">
              <SelectValue>{(v: string) => (v === "all" ? "テーブル" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TABLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-36 h-7 text-sm"
            placeholder="開始日"
          />
          <span className="text-sm text-muted-foreground">〜</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-36 h-7 text-sm"
            placeholder="終了日"
          />

          <Input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-48 h-7 text-sm"
            placeholder="ユーザーID"
          />

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 shrink-0">
              <X className="h-3 w-3 mr-1" />
              クリア
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>操作</TableHead>
              <TableHead>テーブル</TableHead>
              <TableHead>レコードID</TableHead>
              <TableHead>ユーザー</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>変更内容</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={filteredLogs.length === 0}
              emptyMessage="監査ログがありません"
            >
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className={sequenceGaps.has(log.id) ? "bg-yellow-50" : ""}>
                  <TableCell className="text-sm tabular-nums">
                    <div className="flex items-center gap-1">
                      {sequenceGaps.has(log.id) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                      )}
                      {formatDateTime(log.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>{actionBadge(log.action)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {log.table_name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono" title={log.record_id}>
                      {truncateId(log.record_id)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {userNames[log.user_id] ?? truncateId(log.user_id)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{log.source}</span>
                  </TableCell>
                  <TableCell>
                    {Object.keys(log.changes).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        {expandedRows.has(log.id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {expandedRows.has(log.id) ? "閉じる" : "表示"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                    {expandedRows.has(log.id) && Object.keys(log.changes).length > 0 && (
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded max-w-md overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 border-t bg-white">
        <span className="text-sm text-muted-foreground">
          {filteredLogs.length > 0 ? `${filteredLogs.length}件表示` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevPage}
            disabled={cursorStack.length === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            前へ
          </Button>
          <Button variant="outline" size="sm" onClick={goNextPage} disabled={!hasNextPage}>
            次へ
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
