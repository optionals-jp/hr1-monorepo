"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCrmDashboardPage } from "@/features/crm/hooks/use-crm-dashboard-page";
import { formatJpy } from "@/features/crm/rules";
import { activityTypeLabels } from "@/lib/constants/crm";
import {
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";

const activityTypeIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  appointment: Calendar,
  visit: MapPin,
  memo: FileText,
};

function KpiCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrmDashboardPage() {
  const { showToast } = useToast();
  const { kpi, funnel, maxFunnelAmount, activities, todos, handleToggleTodo, formatDate, formatDateTime, isOverdue } = useCrmDashboardPage();

  const onToggleTodo = async (todoId: string, currentCompleted: boolean) => {
    const result = await handleToggleTodo(todoId, currentCompleted);
    if (!result.success && result.error) showToast(result.error, "error");
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="CRMダッシュボード" sticky={false} border={false} breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]} />
      <div className="px-6 pb-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="商談中パイプライン" value={kpi ? formatJpy(kpi.pipelineAmount) : "---"} sub={kpi ? `${kpi.openDeals.length}件の商談` : "---"} icon={<div className="rounded-full bg-blue-100 p-3"><TrendingUp className="size-5 text-blue-600" /></div>} />
          <KpiCard label="受注金額" value={kpi ? formatJpy(kpi.wonAmount) : "---"} sub={kpi ? `${kpi.wonDeals.length}件の受注` : "---"} icon={<div className="rounded-full bg-green-100 p-3"><DollarSign className="size-5 text-green-600" /></div>} />
          <KpiCard label="加重パイプライン" value={kpi ? formatJpy(kpi.weightedAmount) : "---"} sub="確度加重合計" icon={<div className="rounded-full bg-orange-100 p-3"><Target className="size-5 text-orange-600" /></div>} />
          <KpiCard label="受注率" value={kpi ? `${kpi.winRate}%` : "---"} sub={kpi ? `${kpi.wonDeals.length}受注 / ${kpi.wonDeals.length + kpi.lostDeals.length}完了` : "---"} icon={<div className="rounded-full bg-purple-100 p-3"><Percent className="size-5 text-purple-600" /></div>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">パイプライン ステージ</CardTitle></CardHeader>
            <CardContent>
              {funnel.length === 0 ? <p className="text-sm text-muted-foreground">データがありません</p> : (
                <div className="space-y-3">
                  {funnel.map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="min-w-[80px] text-sm font-medium">{s.name}</div>
                      <div className="flex-1 text-sm text-muted-foreground">{s.count}件</div>
                      <div className="text-sm font-medium tabular-nums">{formatJpy(s.amount)}</div>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">合計</span>
                    <span className="text-sm font-bold">{formatJpy(funnel.reduce((sum, s) => sum + s.amount, 0))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">ステージ分布</CardTitle></CardHeader>
            <CardContent>
              {funnel.length === 0 ? <p className="text-sm text-muted-foreground">データがありません</p> : (
                <div className="space-y-3">
                  {funnel.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-sm">{s.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{s.count}件 / {formatJpy(s.amount)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${maxFunnelAmount > 0 ? (s.amount / maxFunnelAmount) * 100 : 0}%`, backgroundColor: s.color, minWidth: s.amount > 0 ? "4px" : "0px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">最近の活動</CardTitle></CardHeader>
            <CardContent>
              {!activities ? <p className="text-sm text-muted-foreground">��み込み中...</p> : activities.length === 0 ? <p className="text-sm text-muted-foreground">活動記録がありません</p> : (
                <div className="space-y-4">
                  {activities.map((a) => {
                    const Ic = activityTypeIcons[a.activity_type] ?? FileText;
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2 mt-0.5 shrink-0"><Ic className="size-3.5 text-muted-foreground" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{a.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{activityTypeLabels[a.activity_type] ?? a.activity_type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.profiles?.display_name && <span className="text-xs text-muted-foreground">{a.profiles.display_name}</span>}
                            <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">TODO</CardTitle></CardHeader>
            <CardContent>
              {!todos ? <p className="text-sm text-muted-foreground">読み込み中...</p> : todos.length === 0 ? <p className="text-sm text-muted-foreground">未完了のTODOはありません</p> : (
                <div className="space-y-3">
                  {todos.map((t) => {
                    const overdue = isOverdue(t.due_date);
                    return (
                      <div key={t.id} className="flex items-start gap-3">
                        <button onClick={() => onToggleTodo(t.id, t.is_completed)} className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity">
                          {t.is_completed ? <CheckCircle2 className="size-5 text-green-500" /> : <Circle className="size-5 text-muted-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.due_date && <span className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}><Clock className="size-3" />{formatDate(t.due_date)}{overdue && " (期限超過)"}</span>}
                            {t.profiles?.display_name && <span className="text-xs text-muted-foreground">{t.profiles.display_name}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
