"use client";

import React from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { cn } from "@/lib/utils";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCompliancePage } from "@/lib/hooks/use-compliance";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react";

const ALERT_TYPE_LABELS: Record<string, string> = {
  leave_usage_warning: "有給消化不足",
  leave_expiry_warning: "期限切れ間近",
  overtime_monthly_warning: "月間残業超過",
  overtime_yearly_warning: "年間残業超過",
  leave_balance_low: "有給残日数少",
  attendance_anomaly: "勤怠異常",
};

const SEVERITY_CONFIG: Record<
  string,
  { label: string; variant: "destructive" | "default" | "outline"; className: string }
> = {
  critical: {
    label: "重大",
    variant: "destructive",
    className: "",
  },
  warning: {
    label: "警告",
    variant: "default",
    className: "bg-yellow-100 text-yellow-800",
  },
  info: {
    label: "情報",
    variant: "default",
    className: "bg-blue-100 text-blue-800",
  },
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function CompliancePage() {
  const { showToast } = useToast();
  const {
    alerts,
    alertsError,
    mutateAlerts,
    running,
    filterSeverity,
    setFilterSeverity,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filteredAlerts,
    summary,
    handleRunCheck,
    handleResolve,
  } = useCompliancePage();

  const onRunCheck = async () => {
    const result = await handleRunCheck();
    if (!result.success) {
      showToast(result.error!, "error");
    } else {
      showToast(`チェック完了: ${result.count}件の新規アラートを検出しました`, "success");
    }
  };

  const onResolve = async (alertId: string) => {
    const result = await handleResolve(alertId);
    if (!result.success) {
      showToast(result.error!, "error");
    } else {
      showToast("対応済みにしました", "success");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="法令ガイド"
        description="コンプライアンスリスクを自動検出しアラートを管理します"
        action={
          <Button onClick={onRunCheck} disabled={running}>
            <Play className="h-4 w-4 mr-1.5" />
            {running ? "チェック中..." : "チェック実行"}
          </Button>
        }
      />

      <QueryErrorBanner error={alertsError} onRetry={() => mutateAlerts()} />

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.critical}</p>
              <p className="text-sm text-muted-foreground">重大</p>
            </div>
          </div>
          <div className="rounded-lg border p-4 flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.warning}</p>
              <p className="text-sm text-muted-foreground">警告</p>
            </div>
          </div>
          <div className="rounded-lg border p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{summary.info}</p>
              <p className="text-sm text-muted-foreground">情報</p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {(filterStatus !== "unresolved" ||
              filterSeverity !== "all" ||
              filterType !== "all") && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {filterStatus !== "unresolved" && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    ステータス：{filterStatus === "resolved" ? "対応済み" : "すべて"}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterStatus("unresolved");
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )}
                {filterSeverity !== "all" && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    重要度：
                    {filterSeverity === "critical"
                      ? "重大"
                      : filterSeverity === "warning"
                        ? "警告"
                        : "情報"}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterSeverity("all");
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )}
                {filterType !== "all" && (
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    種別：{ALERT_TYPE_LABELS[filterType] ?? filterType}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterType("all");
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                )}
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="py-2">ステータス</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="py-2">
                {[
                  { value: "unresolved", label: "未対応" },
                  { value: "resolved", label: "対応済み" },
                  { value: "all", label: "すべて" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="py-2"
                    onClick={() => setFilterStatus(opt.value)}
                  >
                    <span className={cn(filterStatus === opt.value && "font-medium")}>
                      {opt.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="py-2">重要度</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="py-2">
                {[
                  { value: "all", label: "すべて" },
                  { value: "critical", label: "重大" },
                  { value: "warning", label: "警告" },
                  { value: "info", label: "情報" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="py-2"
                    onClick={() => setFilterSeverity(opt.value)}
                  >
                    <span className={cn(filterSeverity === opt.value && "font-medium")}>
                      {opt.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="py-2">種別</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="py-2">
                <DropdownMenuItem className="py-2" onClick={() => setFilterType("all")}>
                  <span className={cn(filterType === "all" && "font-medium")}>すべて</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                  <DropdownMenuItem key={key} className="py-2" onClick={() => setFilterType(key)}>
                    <span className={cn(filterType === key && "font-medium")}>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>重要度</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>検出日</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={7}
                isLoading={!alerts}
                isEmpty={filteredAlerts.length === 0}
                emptyMessage="アラートはありません"
              >
                {filteredAlerts.map((alert) => {
                  const severityCfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                  return (
                    <TableRow key={alert.id} className={cn(alert.is_resolved && "opacity-60")}>
                      <TableCell>
                        <SeverityIcon severity={alert.severity} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityCfg.variant} className={severityCfg.className}>
                          {severityCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </TableCell>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {alert.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateJa(alert.created_at)}
                      </TableCell>
                      <TableCell>
                        {!alert.is_resolved && (
                          <Button variant="outline" size="sm" onClick={() => onResolve(alert.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            対応済み
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      </div>
    </div>
  );
}
