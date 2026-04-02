"use client";

import { useMemo } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useCrmDealsAll } from "@/lib/hooks/use-crm";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchStageHistory } from "@/lib/repositories/crm-repository";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { cn } from "@/lib/utils";
import { ReportNav } from "@/components/crm/report-nav";
import { Clock, TrendingDown, Zap } from "lucide-react";

export default function PipelineReportPage() {
  const { data: deals, error } = useCrmDealsAll();
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  const { data: stageHistory } = useOrgQuery("crm-stage-history-all", (orgId) =>
    fetchStageHistory(getSupabase(), orgId)
  );

  const openDeals = useMemo(() => (deals ?? []).filter((d) => d.status === "open"), [deals]);
  const wonDeals = useMemo(() => (deals ?? []).filter((d) => d.status === "won"), [deals]);

  // ステージ別の商談数と金額
  const stageMetrics = useMemo(() => {
    return stages.map((stage) => {
      const stageDeals = openDeals.filter(
        (d) => d.stage_id === stage.id || (!d.stage_id && d.stage === stage.name)
      );
      const amount = stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
      const weighted = stageDeals.reduce(
        (sum, d) => sum + (d.amount ?? 0) * ((d.probability ?? 0) / 100),
        0
      );

      // 滞留日数: ステージ変更履歴から平均日数を計算
      const transitions = (stageHistory ?? []).filter((h) => h.to_stage_id === stage.id);
      let avgDays = 0;
      if (transitions.length > 0) {
        const durations = transitions
          .map((t) => {
            const exit = (stageHistory ?? []).find(
              (h) =>
                h.deal_id === t.deal_id &&
                h.from_stage_id === stage.id &&
                h.changed_at > t.changed_at
            );
            if (!exit) return null;
            return (
              (new Date(exit.changed_at).getTime() - new Date(t.changed_at).getTime()) /
              (1000 * 60 * 60 * 24)
            );
          })
          .filter((d): d is number => d !== null);
        avgDays =
          durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      }

      return {
        stage,
        count: stageDeals.length,
        amount,
        weighted,
        avgDays: Math.round(avgDays * 10) / 10,
      };
    });
  }, [stages, openDeals, stageHistory]);

  // コンバージョン率: ステージ間の進行率
  const conversionRates = useMemo(() => {
    if (stages.length < 2) return [];
    return stages.slice(0, -1).map((stage, i) => {
      const nextStage = stages[i + 1];
      const currentCount = stageMetrics[i]?.count ?? 0;
      const nextCount = stageMetrics[i + 1]?.count ?? 0;
      const rate = currentCount > 0 ? Math.round((nextCount / currentCount) * 100) : 0;
      return {
        from: stage.name,
        to: nextStage.name,
        rate,
        fromColor: stage.color,
        toColor: nextStage.color,
      };
    });
  }, [stages, stageMetrics]);

  // パイプライン速度: (商談数 × 平均金額 × 勝率) / 平均商談日数
  const pipelineVelocity = useMemo(() => {
    const allDeals = deals ?? [];
    const closedDeals = allDeals.filter((d) => d.status === "won" || d.status === "lost");
    const winRate = closedDeals.length > 0 ? wonDeals.length / closedDeals.length : 0;
    const avgAmount =
      openDeals.length > 0
        ? openDeals.reduce((s, d) => s + (d.amount ?? 0), 0) / openDeals.length
        : 0;
    const totalAvgDays = stageMetrics.reduce((s, m) => s + m.avgDays, 0) || 1;

    return {
      dealCount: openDeals.length,
      avgAmount,
      winRate: Math.round(winRate * 100),
      avgDays: Math.round(totalAvgDays),
      velocity: Math.round((openDeals.length * avgAmount * winRate) / totalAvgDays),
    };
  }, [deals, openDeals, wonDeals, stageMetrics]);

  return (
    <div className="flex flex-col bg-white">
      <PageHeader
        title="パイプライン分析"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "商談管理", href: "/crm/deals" },
          { label: "レポート", href: "/crm/reports/forecast" },
        ]}
      />
      {error && <QueryErrorBanner error={error} />}
      <ReportNav />

      <PageContent>
        <div className="space-y-6">
          {/* パイプライン速度 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="size-4" />
                パイプライン速度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricBox label="商談中" value={pipelineVelocity.dealCount} suffix="件" />
                <MetricBox
                  label="平均金額"
                  value={`¥${Math.round(pipelineVelocity.avgAmount).toLocaleString()}`}
                />
                <MetricBox label="勝率" value={pipelineVelocity.winRate} suffix="%" />
                <MetricBox label="平均商談日数" value={pipelineVelocity.avgDays} suffix="日" />
                <MetricBox
                  label="日次速度"
                  value={`¥${pipelineVelocity.velocity.toLocaleString()}`}
                  highlight
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                速度 = (商談数 × 平均金額 × 勝率) / 平均商談日数
              </p>
            </CardContent>
          </Card>

          {/* ステージ別メトリクス */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="size-4" />
                ステージ別分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2 font-medium">ステージ</th>
                      <th className="text-right px-4 py-2 font-medium">商談数</th>
                      <th className="text-right px-4 py-2 font-medium">総額</th>
                      <th className="text-right px-4 py-2 font-medium">加重金額</th>
                      <th className="text-right px-4 py-2 font-medium">平均滞留日数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageMetrics.map((m) => (
                      <tr key={m.stage.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: m.stage.color }}
                            />
                            <span className="font-medium">{m.stage.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{m.count}件</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          ¥{m.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          ¥{m.weighted.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span
                              className={cn(
                                "tabular-nums",
                                m.avgDays > 14 && "text-orange-600 font-medium"
                              )}
                            >
                              {m.avgDays > 0 ? `${m.avgDays}日` : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* コンバージョン率 */}
          {conversionRates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ステージ間コンバージョン</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conversionRates.map((cr, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: cr.fromColor }}
                      >
                        {cr.from}
                      </Badge>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(cr.rate, 100)}%`,
                            backgroundColor: cr.toColor,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right tabular-nums">
                        {cr.rate}%
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: cr.toColor }}
                      >
                        {cr.to}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </div>
  );
}

function MetricBox({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", highlight && "bg-primary/5 border-primary/20")}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-xl font-bold tabular-nums", highlight && "text-primary")}>
          {value}
        </span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
