"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useAutomationLogs } from "@/lib/hooks/use-automation";
import { automationTriggerLabels, automationActionLabels } from "@/lib/constants";
import type { BadgeVariant } from "@/lib/constants/types";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  success: "成功",
  partial: "一部成功",
  failed: "失敗",
};

const statusColors: Record<string, BadgeVariant> = {
  success: "secondary",
  partial: "default",
  failed: "destructive",
};

export default function AutomationLogsPage() {
  const { data: logs } = useAutomationLogs();

  return (
    <div>
      <PageHeader
        title="自動化ログ"
        breadcrumb={[
          { label: "CRM設定", href: "/crm/settings/pipelines" },
          { label: "自動化ルール", href: "/crm/settings/automations" },
        ]}
        action={
          <Link href="/crm/settings/automations">
            <Button variant="outline">ルール管理に戻る</Button>
          </Link>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>実行日時</TableHead>
            <TableHead>ルール名</TableHead>
            <TableHead>トリガー</TableHead>
            <TableHead>アクション</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>エラー</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmptyState
            colSpan={6}
            isLoading={!logs}
            isEmpty={(logs ?? []).length === 0}
            emptyMessage="実行ログがありません"
          >
            {(logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs tabular-nums">
                  {new Date(log.executed_at).toLocaleString("ja-JP")}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {log.crm_automation_rules?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {automationTriggerLabels[log.trigger_type] ?? log.trigger_type}
                </TableCell>
                <TableCell className="text-xs">
                  {log.actions_executed
                    .map((a) => automationActionLabels[a.type] ?? a.type)
                    .join("、")}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[log.status]}>
                    {statusLabels[log.status] ?? log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-48 truncate">
                  {log.error_message ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableEmptyState>
        </TableBody>
      </Table>
    </div>
  );
}
