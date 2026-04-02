"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useCrmDealsAll, useCrmCompanies, useCrmContacts, useCrmLeads } from "@/lib/hooks/use-crm";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchRecentActivities, fetchUpcomingTodos } from "@/lib/repositories/crm-repository";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { activityTypeLabels } from "@/lib/constants/crm";
import { dealStatusLabels } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import {
  Building2,
  Contact,
  Handshake,
  TrendingUp,
  CircleDollarSign,
  Target,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  visit: MapPin,
  memo: FileText,
  appointment: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "text-blue-600",
  email: "text-green-600",
  visit: "text-orange-600",
  memo: "text-gray-500",
  appointment: "text-purple-600",
};

export default function CrmDashboardPage() {
  const { data: deals, error: dealsError } = useCrmDealsAll();
  const { data: companies } = useCrmCompanies();
  const { data: contacts } = useCrmContacts();
  const { data: leads } = useCrmLeads();
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  const { data: recentActivities } = useOrgQuery("crm-recent-activities", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId)
  );

  const { data: upcomingTodos } = useOrgQuery("crm-upcoming-todos", (orgId) =>
    fetchUpcomingTodos(getSupabase(), orgId)
  );

  // KPI計算
  const openDeals = (deals ?? []).filter((d) => d.status === "open");
  const wonDeals = (deals ?? []).filter((d) => d.status === "won");
  const lostDeals = (deals ?? []).filter((d) => d.status === "lost");
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;
  const pipelineAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const wonAmount = wonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const weightedAmount = openDeals.reduce(
    (sum, d) => sum + (d.amount ?? 0) * ((d.probability ?? 0) / 100),
    0
  );

  // パイプラインファネル
  const stageData = stages.map((stage) => {
    const stageDeals = openDeals.filter(
      (d) => d.stage_id === stage.id || (!d.stage_id && d.stage === stage.name)
    );
    return {
      ...stage,
      count: stageDeals.length,
      amount: stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    };
  });
  const maxStageCount = Math.max(...stageData.map((s) => s.count), 1);

  // 担当者別商談サマリー
  const assigneeSummary = Object.values(
    openDeals.reduce(
      (acc, d) => {
        const name = d.profiles?.display_name ?? "未割当";
        if (!acc[name]) acc[name] = { name, count: 0, amount: 0 };
        acc[name].count++;
        acc[name].amount += d.amount ?? 0;
        return acc;
      },
      {} as Record<string, { name: string; count: number; amount: number }>
    )
  ).sort((a, b) => b.amount - a.amount);

  // 新規リード数
  const newLeads = (leads ?? []).filter((l) => l.status === "new").length;

  return (
    <div className="flex flex-col">
      <PageHeader title="CRMダッシュボード" sticky={false} border={false} />
      {dealsError && <QueryErrorBanner error={dealsError} />}

      <PageContent>
        <div className="space-y-6">
          {/* KPIカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="商談中"
              value={openDeals.length}
              suffix="件"
              icon={Handshake}
              href="/crm/deals"
            />
            <KpiCard
              label="パイプライン総額"
              value={formatJpy(pipelineAmount)}
              icon={CircleDollarSign}
              href="/crm/deals"
            />
            <KpiCard
              label="受注額（累計）"
              value={formatJpy(wonAmount)}
              icon={TrendingUp}
              href="/crm/deals"
            />
            <KpiCard label="勝率" value={winRate} suffix="%" icon={Target} href="/crm/deals" />
          </div>

          {/* セカンダリKPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="加重パイプライン"
              value={formatJpy(weightedAmount)}
              icon={CircleDollarSign}
              variant="secondary"
            />
            <KpiCard
              label="取引先企業"
              value={companies?.length ?? 0}
              suffix="社"
              icon={Building2}
              href="/crm/companies"
              variant="secondary"
            />
            <KpiCard
              label="連絡先"
              value={contacts?.length ?? 0}
              suffix="件"
              icon={Contact}
              href="/crm/contacts"
              variant="secondary"
            />
            <KpiCard
              label="新規リード"
              value={newLeads}
              suffix="件"
              icon={UserPlus}
              href="/crm/leads"
              variant="secondary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* パイプラインファネル */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">パイプラインファネル</CardTitle>
                <Link href="/crm/deals">
                  <Button variant="ghost" size="sm">
                    詳細 <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stageData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    パイプラインが未設定です
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stageData.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-24 text-sm truncate shrink-0" title={s.name}>
                          {s.name}
                        </div>
                        <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all flex items-center px-2"
                            style={{
                              width: `${Math.max((s.count / maxStageCount) * 100, 4)}%`,
                              backgroundColor: s.color,
                            }}
                          >
                            <span className="text-xs text-white font-medium whitespace-nowrap">
                              {s.count}件
                            </span>
                          </div>
                        </div>
                        <div className="w-28 text-right text-sm text-muted-foreground shrink-0">
                          {s.amount > 0 ? `¥${s.amount.toLocaleString()}` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 担当者別サマリー */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">担当者別</CardTitle>
              </CardHeader>
              <CardContent>
                {assigneeSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">データなし</p>
                ) : (
                  <div className="space-y-3">
                    {assigneeSummary.slice(0, 8).map((a) => (
                      <div key={a.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {a.name[0]}
                          </div>
                          <span className="truncate">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {a.count}件
                          </Badge>
                          <span className="text-muted-foreground w-20 text-right">
                            {a.amount > 0 ? `¥${(a.amount / 10000).toFixed(0)}万` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 直近の活動 */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">直近の活動</CardTitle>
              </CardHeader>
              <CardContent>
                {!recentActivities || recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">活動記録なし</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((a) => {
                      const Icon = ACTIVITY_ICONS[a.activity_type] ?? FileText;
                      const colorClass = ACTIVITY_COLORS[a.activity_type] ?? "text-gray-500";
                      const label = activityTypeLabels[a.activity_type] ?? a.activity_type;
                      const authorName = a.profiles?.display_name ?? a.profiles?.email ?? null;
                      return (
                        <div key={a.id} className="flex items-start gap-3">
                          <Icon className={cn("size-4 mt-0.5 shrink-0", colorClass)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              {authorName && (
                                <span className="font-medium truncate">{authorName}</span>
                              )}
                              <span className="text-muted-foreground">{label}</span>
                            </div>
                            {a.title !== label && (
                              <p className="text-sm text-muted-foreground truncate">{a.title}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(a.created_at), "M/d HH:mm")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 期限間近のTODO */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">期限間近のタスク</CardTitle>
              </CardHeader>
              <CardContent>
                {!upcomingTodos || upcomingTodos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    未完了のタスクなし
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingTodos.map((todo) => {
                      const isOverdue = todo.due_date && new Date(todo.due_date) < new Date();
                      const assignee = todo.profiles?.display_name ?? todo.profiles?.email ?? null;
                      return (
                        <div key={todo.id} className="flex items-start gap-3">
                          {todo.is_completed ? (
                            <CheckCircle2 className="size-4 mt-0.5 text-green-500 shrink-0" />
                          ) : (
                            <Clock
                              className={cn(
                                "size-4 mt-0.5 shrink-0",
                                isOverdue ? "text-destructive" : "text-muted-foreground"
                              )}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{todo.title}</p>
                            {assignee && (
                              <p className="text-xs text-muted-foreground">{assignee}</p>
                            )}
                          </div>
                          {todo.due_date && (
                            <span
                              className={cn(
                                "text-xs shrink-0",
                                isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(todo.due_date), "M/d")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ステータス別商談サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusSummaryCard label="商談中" deals={openDeals} status="open" color="bg-blue-500" />
            <StatusSummaryCard label="受注" deals={wonDeals} status="won" color="bg-green-500" />
            <StatusSummaryCard label="失注" deals={lostDeals} status="lost" color="bg-red-500" />
          </div>

          {/* レポートリンク */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">レポート</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    href: "/crm/reports/forecast",
                    label: "売上予測",
                    description: "カテゴリ別・期間別の売上予測",
                    icon: TrendingUp,
                  },
                  {
                    href: "/crm/reports/pipeline",
                    label: "パイプライン分析",
                    description: "ステージ別分析・コンバージョン率",
                    icon: Target,
                  },
                  {
                    href: "/crm/reports/win-loss",
                    label: "勝敗分析",
                    description: "受注・失注の傾向と勝率推移",
                    icon: Handshake,
                  },
                  {
                    href: "/crm/reports/performance",
                    label: "担当者パフォーマンス",
                    description: "担当者別の実績と活動量",
                    icon: UserPlus,
                  },
                ].map((report) => (
                  <Link key={report.href} href={report.href}>
                    <div className="rounded-lg border p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer h-full">
                      <report.icon className="size-5 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">{report.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}

// --- Helper Components ---

function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  href,
  variant = "default",
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: typeof TrendingUp;
  href?: string;
  variant?: "default" | "secondary";
}) {
  const content = (
    <Card
      className={cn(
        "transition-colors",
        href && "hover:border-primary/40 cursor-pointer",
        variant === "secondary" && "bg-muted/30"
      )}
    >
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusSummaryCard({
  label,
  deals,
  status,
  color,
}: {
  label: string;
  deals: { amount?: number | null; title: string; bc_companies?: { name?: string } | null }[];
  status: string;
  color: string;
}) {
  const total = deals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn("size-2.5 rounded-full", color)} />
          <CardTitle className="text-sm">
            {label}（{deals.length}件）
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold mb-2">{total > 0 ? `¥${total.toLocaleString()}` : "—"}</p>
        {deals.length > 0 ? (
          <div className="space-y-1.5">
            {deals.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{d.title}</span>
                <span className="shrink-0 ml-2">
                  {d.amount != null ? `¥${d.amount.toLocaleString()}` : "—"}
                </span>
              </div>
            ))}
            {deals.length > 3 && (
              <p className="text-xs text-muted-foreground">他 {deals.length - 3}件</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {dealStatusLabels[status] ?? status}の商談はありません
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatJpy(amount: number): string {
  if (amount >= 100_000_000) return `¥${(amount / 100_000_000).toFixed(1)}億`;
  if (amount >= 10_000) return `¥${(amount / 10_000).toFixed(0)}万`;
  if (amount > 0) return `¥${amount.toLocaleString()}`;
  return "¥0";
}
