"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { useAuditLogs } from "@/lib/hooks/use-audit-logs";
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

export default function AuditLogsPage() {
  const h = useAuditLogs();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.error} onRetry={h.retry} />
      <PageHeader
        title="監査ログ"
        description="組織全体の操作ログ"
        sticky={false}
        border={false}
        action={
          <Button variant="outline" size="sm" onClick={h.handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV出力
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={h.search}
          onChange={h.setSearch}
          placeholder="変更内容・レコードID等で検索"
        />
        <div className="flex items-center gap-2 w-full bg-white px-4 sm:px-6 md:px-8 py-2 overflow-x-auto">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>

          <Select value={h.filterAction} onValueChange={(v) => h.setFilterAction(v ?? "all")}>
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

          <Select value={h.filterTable} onValueChange={(v) => h.setFilterTable(v ?? "all")}>
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
            value={h.filterDateFrom}
            onChange={(e) => h.setFilterDateFrom(e.target.value)}
            className="w-36 h-7 text-sm"
            placeholder="開始日"
          />
          <span className="text-sm text-muted-foreground">〜</span>
          <Input
            type="date"
            value={h.filterDateTo}
            onChange={(e) => h.setFilterDateTo(e.target.value)}
            className="w-36 h-7 text-sm"
            placeholder="終了日"
          />

          <Input
            type="text"
            value={h.filterUser}
            onChange={(e) => h.setFilterUser(e.target.value)}
            className="w-48 h-7 text-sm"
            placeholder="ユーザーID"
          />

          {h.activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={h.clearFilters} className="h-7 shrink-0">
              <X className="h-3 w-3 mr-1" />
              クリア
            </Button>
          )}
        </div>
      </StickyFilterBar>

      <TableSection>
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
              isLoading={h.isLoading}
              isEmpty={h.filteredLogs.length === 0}
              emptyMessage="監査ログがありません"
            >
              {h.filteredLogs.map((log) => (
                <TableRow key={log.id} className={h.sequenceGaps.has(log.id) ? "bg-yellow-50" : ""}>
                  <TableCell className="text-sm tabular-nums">
                    <div className="flex items-center gap-1">
                      {h.sequenceGaps.has(log.id) && (
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
                    {h.userNames[log.user_id] ?? truncateId(log.user_id)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{log.source}</span>
                  </TableCell>
                  <TableCell>
                    {Object.keys(log.changes).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => h.toggleExpand(log.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        {h.expandedRows.has(log.id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {h.expandedRows.has(log.id) ? "閉じる" : "表示"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                    {h.expandedRows.has(log.id) && Object.keys(log.changes).length > 0 && (
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
      </TableSection>

      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 border-t bg-white">
        <span className="text-sm text-muted-foreground">
          {h.filteredLogs.length > 0 ? `${h.filteredLogs.length}件表示` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={h.goPrevPage}
            disabled={h.cursorStack.length === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            前へ
          </Button>
          <Button variant="outline" size="sm" onClick={h.goNextPage} disabled={!h.hasNextPage}>
            次へ
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
