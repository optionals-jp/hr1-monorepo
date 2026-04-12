"use client";

import { useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import {
  fetchDeals,
  fetchRecentActivities,
  fetchStageHistory,
} from "@/lib/repositories/crm-repository";
import {
  computeWinLossSummary,
  computeMonthlyTrend,
  computeAmountBrackets,
  computeRepWinRates,
  computeRepPerformance,
  computeStageMetrics,
  computeConversionRates,
  computePipelineVelocity,
  formatJpy,
  getDateFilter,
} from "@/features/crm/rules";
import type { BcDeal, BcActivity, CrmDealStageHistory } from "@/types/database";
import { cn } from "@/lib/utils";

type ReportTab = "winloss" | "performance" | "pipeline";

export default function ReportsPage() {
  const { data: pipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(pipeline);

  const [activeTab, setActiveTab] = useState<ReportTab>("winloss");
  const [period, setPeriod] = useState("6m");

  const { data: allDeals } = useOrgQuery<BcDeal[]>("crm-deals-reports", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: allActivities } = useOrgQuery<BcActivity[]>("crm-activities-reports", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId, 500)
  );

  const { data: stageHistory } = useOrgQuery<CrmDealStageHistory[]>(
    "crm-stage-history-reports",
    (orgId) => fetchStageHistory(getSupabase(), orgId)
  );

  const dateFilter = getDateFilter(period);
  const deals = (allDeals ?? []).filter((d) => {
    if (!dateFilter) return true;
    return new Date(d.created_at) >= dateFilter;
  });
  const activities = (allActivities ?? []).filter((a) => {
    if (!dateFilter) return true;
    return new Date(a.created_at) >= dateFilter;
  });

  // Win/Loss Analysis
  const wlSummary = computeWinLossSummary(deals);
  const monthlyTrend = computeMonthlyTrend(wlSummary.wonDeals, wlSummary.lostDeals);
  const brackets = computeAmountBrackets(wlSummary.wonDeals, wlSummary.lostDeals);
  const repWinRates = computeRepWinRates(wlSummary.wonDeals, wlSummary.lostDeals);

  // Performance
  const repPerformance = computeRepPerformance(deals, activities);

  // Pipeline Analysis
  const openDeals = deals.filter((d) => d.status === "open");
  const wonDeals = deals.filter((d) => d.status === "won");
  const stageMetrics = computeStageMetrics(stages, openDeals, stageHistory ?? []);
  const conversionRates = computeConversionRates(stages, stageMetrics);
  const velocity = computePipelineVelocity(deals, openDeals, wonDeals, stageMetrics);

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "winloss", label: "受注・失注分析" },
    { key: "performance", label: "担当者パフォーマンス" },
    { key: "pipeline", label: "パイプライン分析" },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="レポート"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]}
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v ?? "6m")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">直近3ヶ月</SelectItem>
              <SelectItem value="6m">直近6ヶ月</SelectItem>
              <SelectItem value="12m">直近1年</SelectItem>
              <SelectItem value="all">全期間</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Win/Loss Analysis */}
        {activeTab === "winloss" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">受注率</p>
                  <p className="text-2xl font-bold">{wlSummary.winRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {wlSummary.closedCount}件中 {wlSummary.wonDeals.length}件受注
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">受注金額</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatJpy(wlSummary.wonAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    平均 {formatJpy(wlSummary.avgWonAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">失注金額</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatJpy(wlSummary.lostAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    平均 {formatJpy(wlSummary.avgLostAmount)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">クローズ件数</p>
                  <p className="text-2xl font-bold">{wlSummary.closedCount}件</p>
                  <p className="text-xs text-muted-foreground">
                    受注 {wlSummary.wonDeals.length} / 失注 {wlSummary.lostDeals.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">月次トレンド</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    データがありません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {monthlyTrend.map((m) => {
                      const total = m.won + m.lost;
                      const wonPct = total > 0 ? (m.won / total) * 100 : 0;
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-sm font-mono w-16 shrink-0">{m.month}</span>
                          <div className="flex-1 flex h-5 rounded overflow-hidden bg-muted">
                            {m.won > 0 && (
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${wonPct}%` }}
                              />
                            )}
                            {m.lost > 0 && (
                              <div
                                className="h-full bg-red-400"
                                style={{ width: `${100 - wonPct}%` }}
                              />
                            )}
                          </div>
                          <span className="text-xs w-20 shrink-0 text-right">
                            受注{m.won} / 失注{m.lost}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-green-500" />
                        <span className="text-xs text-muted-foreground">受注</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-red-400" />
                        <span className="text-xs text-muted-foreground">失注</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amount Brackets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">金額帯別受注率</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>金額帯</TableHead>
                      <TableHead className="text-right">受注</TableHead>
                      <TableHead className="text-right">失注</TableHead>
                      <TableHead className="text-right">合計</TableHead>
                      <TableHead className="text-right">受注率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brackets.map((b) => (
                      <TableRow key={b.label}>
                        <TableCell className="font-medium">{b.label}</TableCell>
                        <TableCell className="text-right text-green-600">{b.won}</TableCell>
                        <TableCell className="text-right text-red-600">{b.lost}</TableCell>
                        <TableCell className="text-right">{b.total}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={b.rate >= 50 ? "secondary" : "destructive"}>
                            {b.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Rep Win Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">担当者別受注率</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>担当者</TableHead>
                      <TableHead className="text-right">受注</TableHead>
                      <TableHead className="text-right">失注</TableHead>
                      <TableHead className="text-right">合計</TableHead>
                      <TableHead className="text-right">受注率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repWinRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      repWinRates.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right text-green-600">{r.won}</TableCell>
                          <TableCell className="text-right text-red-600">{r.lost}</TableCell>
                          <TableCell className="text-right">{r.total}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={r.rate >= 50 ? "secondary" : "destructive"}>
                              {r.rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">担当者パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>担当者</TableHead>
                      <TableHead className="text-right">商談数</TableHead>
                      <TableHead className="text-right">受注</TableHead>
                      <TableHead className="text-right">失注</TableHead>
                      <TableHead className="text-right">受注金額</TableHead>
                      <TableHead className="text-right">活動数</TableHead>
                      <TableHead className="text-right">受注率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repPerformance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      repPerformance.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right">{r.deals}</TableCell>
                          <TableCell className="text-right text-green-600">{r.won}</TableCell>
                          <TableCell className="text-right text-red-600">{r.lost}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatJpy(r.wonAmount)}
                          </TableCell>
                          <TableCell className="text-right">{r.activities}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={r.winRate >= 50 ? "secondary" : "default"}>
                              {r.winRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activity per rep - visual bars */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">担当者別活動量</CardTitle>
              </CardHeader>
              <CardContent>
                {repPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    データがありません
                  </p>
                ) : (
                  <div className="space-y-3">
                    {repPerformance
                      .filter((r) => r.activities > 0)
                      .map((r) => {
                        const maxAct = Math.max(...repPerformance.map((rp) => rp.activities), 1);
                        return (
                          <div key={r.name} className="flex items-center gap-3">
                            <span className="text-sm w-24 shrink-0 truncate">{r.name}</span>
                            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${(r.activities / maxAct) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono w-12 text-right shrink-0">
                              {r.activities}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pipeline Analysis Tab */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            {/* Velocity Card */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">商談数</p>
                  <p className="text-2xl font-bold">{velocity.dealCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">平均金額</p>
                  <p className="text-2xl font-bold">{formatJpy(velocity.avgAmount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">受注率</p>
                  <p className="text-2xl font-bold">{velocity.winRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">平均日数</p>
                  <p className="text-2xl font-bold">{velocity.avgDays}日</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">ベロシティ</p>
                  <p className="text-2xl font-bold">{formatJpy(velocity.velocity)}</p>
                  <p className="text-xs text-muted-foreground">/ 日</p>
                </CardContent>
              </Card>
            </div>

            {/* Stage Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ステージ別メトリクス</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ステージ</TableHead>
                      <TableHead className="text-right">件数</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="text-right">加重金額</TableHead>
                      <TableHead className="text-right">平均滞留日数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stageMetrics.map((sm) => (
                      <TableRow key={sm.stage.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: sm.stage.color }}
                            />
                            <span className="font-medium">{sm.stage.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{sm.count}</TableCell>
                        <TableCell className="text-right">{formatJpy(sm.amount)}</TableCell>
                        <TableCell className="text-right">{formatJpy(sm.weighted)}</TableCell>
                        <TableCell className="text-right">{sm.avgDays}日</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Conversion Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ステージ間コンバージョン率</CardTitle>
              </CardHeader>
              <CardContent>
                {conversionRates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    データがありません
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-2 flex-wrap py-4">
                    {conversionRates.map((cr, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="px-3 py-2 rounded-lg border text-sm font-medium"
                          style={{ borderColor: cr.fromColor }}
                        >
                          {cr.from}
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold">{cr.rate}%</span>
                          <span className="text-muted-foreground">→</span>
                        </div>
                        {i === conversionRates.length - 1 && (
                          <div
                            className="px-3 py-2 rounded-lg border text-sm font-medium"
                            style={{ borderColor: cr.toColor }}
                          >
                            {cr.to}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
