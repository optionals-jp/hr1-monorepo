"use client";

import React, { useState, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { ComplianceAlert } from "@/types/database";
import { Play, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

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
  const { organization } = useOrg();
  const [running, setRunning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("unresolved");

  const {
    data: alerts,
    error: alertsError,
    mutate: mutateAlerts,
  } = useQuery<ComplianceAlert[]>(
    organization ? `compliance-alerts-${organization.id}` : null,
    async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("compliance_alerts")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as ComplianceAlert[];
    }
  );

  const filteredAlerts = useMemo(() => {
    let rows = alerts ?? [];
    if (filterStatus === "unresolved") {
      rows = rows.filter((a) => !a.is_resolved);
    } else if (filterStatus === "resolved") {
      rows = rows.filter((a) => a.is_resolved);
    }
    if (filterSeverity !== "all") {
      rows = rows.filter((a) => a.severity === filterSeverity);
    }
    if (filterType !== "all") {
      rows = rows.filter((a) => a.alert_type === filterType);
    }
    return rows;
  }, [alerts, filterSeverity, filterType, filterStatus]);

  const summary = useMemo(() => {
    const unresolved = (alerts ?? []).filter((a) => !a.is_resolved);
    return {
      critical: unresolved.filter((a) => a.severity === "critical").length,
      warning: unresolved.filter((a) => a.severity === "warning").length,
      info: unresolved.filter((a) => a.severity === "info").length,
    };
  }, [alerts]);

  const handleRunCheck = async () => {
    if (!organization) return;
    setRunning(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("check_compliance_alerts", {
        p_organization_id: organization.id,
      });
      if (error) throw error;
      await mutateAlerts();
      showToast(`チェック完了: ${data ?? 0}件の新規アラートを検出しました`, "success");
    } catch {
      showToast("チェックに失敗しました", "error");
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("compliance_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .eq("id", alertId)
        .eq("organization_id", organization!.id);
      if (error) throw error;
      await mutateAlerts();
      showToast("対応済みにしました", "success");
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="法令ガイド"
        description="コンプライアンスリスクを自動検出しアラートを管理します"
        action={
          <Button onClick={handleRunCheck} disabled={running}>
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

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unresolved">未対応</SelectItem>
              <SelectItem value="resolved">対応済み</SelectItem>
              <SelectItem value="all">すべて</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={(v) => v && setFilterSeverity(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">重要度: すべて</SelectItem>
              <SelectItem value="critical">重大</SelectItem>
              <SelectItem value="warning">警告</SelectItem>
              <SelectItem value="info">情報</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">種別: すべて</SelectItem>
              {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                          >
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
        </div>
      </div>
    </div>
  );
}
