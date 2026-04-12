"use client";

import { useCallback } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchDeals,
  fetchRecentActivities,
  fetchUpcomingTodos,
  toggleTodoComplete,
} from "@/lib/repositories/crm-repository";
import { computeCrmKpi, computeStageFunnel, formatJpy } from "@/features/crm/rules";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function CrmDashboardPage() {
  const { organization } = useOrg();
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  const { data: deals } = useOrgQuery("crm-dashboard-deals", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: activities } = useOrgQuery("crm-dashboard-activities", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId, 10)
  );

  const { data: todos, mutate: mutateTodos } = useOrgQuery("crm-dashboard-todos", (orgId) =>
    fetchUpcomingTodos(getSupabase(), orgId)
  );

  const kpi = deals ? computeCrmKpi(deals) : null;
  const funnel = kpi ? computeStageFunnel(stages, kpi.openDeals) : [];

  const handleToggleTodo = useCallback(
    async (todoId: string, currentCompleted: boolean) => {
      if (!organization) return;
      try {
        await toggleTodoComplete(getSupabase(), todoId, organization.id, !currentCompleted);
        mutateTodos();
      } catch {
        // エラー時は何もしない
      }
    },
    [organization, mutateTodos]
  );

  const maxFunnelAmount = Math.max(...funnel.map((s) => s.amount), 1);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="CRMダッシュボード"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]}
      />

      <div className="px-6 pb-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">商談中パイプライン</p>
                  <p className="text-2xl font-bold mt-1">
                    {kpi ? formatJpy(kpi.pipelineAmount) : "---"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi ? `${kpi.openDeals.length}件の商談` : "---"}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <TrendingUp className="size-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">受注金額</p>
                  <p className="text-2xl font-bold mt-1">
                    {kpi ? formatJpy(kpi.wonAmount) : "---"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi ? `${kpi.wonDeals.length}件の受注` : "---"}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <DollarSign className="size-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">加重パイプライン</p>
                  <p className="text-2xl font-bold mt-1">
                    {kpi ? formatJpy(kpi.weightedAmount) : "---"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">確度加重合計</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <Target className="size-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">受注率</p>
                  <p className="text-2xl font-bold mt-1">{kpi ? `${kpi.winRate}%` : "---"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi
                      ? `${kpi.wonDeals.length}受注 / ${kpi.wonDeals.length + kpi.lostDeals.length}完了`
                      : "---"}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <Percent className="size-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel & Deal Stage Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Stage Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">パイプライン ステージ</CardTitle>
            </CardHeader>
            <CardContent>
              {funnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">データがありません</p>
              ) : (
                <div className="space-y-3">
                  {funnel.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-3">
                      <span
                        className="inline-block w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div className="min-w-[80px] text-sm font-medium">{stage.name}</div>
                      <div className="flex-1 text-sm text-muted-foreground">{stage.count}件</div>
                      <div className="text-sm font-medium tabular-nums">
                        {formatJpy(stage.amount)}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">合計</span>
                    <span className="text-sm font-bold">
                      {formatJpy(funnel.reduce((sum, s) => sum + s.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal Stage Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ステージ分布</CardTitle>
            </CardHeader>
            <CardContent>
              {funnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">データがありません</p>
              ) : (
                <div className="space-y-3">
                  {funnel.map((stage) => (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-sm">{stage.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stage.count}件 / {formatJpy(stage.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: `${maxFunnelAmount > 0 ? (stage.amount / maxFunnelAmount) * 100 : 0}%`,
                            backgroundColor: stage.color,
                            minWidth: stage.amount > 0 ? "4px" : "0px",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities & Upcoming TODOs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近の活動</CardTitle>
            </CardHeader>
            <CardContent>
              {!activities ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">活動記録がありません</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const IconComponent = activityTypeIcons[activity.activity_type] ?? FileText;
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2 mt-0.5 shrink-0">
                          <IconComponent className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{activity.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {activityTypeLabels[activity.activity_type] ?? activity.activity_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {activity.profiles?.display_name && (
                              <span className="text-xs text-muted-foreground">
                                {activity.profiles.display_name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming TODOs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">TODO</CardTitle>
            </CardHeader>
            <CardContent>
              {!todos ? (
                <p className="text-sm text-muted-foreground">読み込み中...</p>
              ) : todos.length === 0 ? (
                <p className="text-sm text-muted-foreground">未完了のTODOはありません</p>
              ) : (
                <div className="space-y-3">
                  {todos.map((todo) => {
                    const overdue = isOverdue(todo.due_date);
                    return (
                      <div key={todo.id} className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTodo(todo.id, todo.is_completed)}
                          className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity"
                        >
                          {todo.is_completed ? (
                            <CheckCircle2 className="size-5 text-green-500" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${todo.is_completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {todo.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {todo.due_date && (
                              <span
                                className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                              >
                                <Clock className="size-3" />
                                {formatDate(todo.due_date)}
                                {overdue && " (期限超過)"}
                              </span>
                            )}
                            {todo.profiles?.display_name && (
                              <span className="text-xs text-muted-foreground">
                                {todo.profiles.display_name}
                              </span>
                            )}
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
