"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useCrmDealsAll } from "@/lib/hooks/use-crm";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchRecentActivities } from "@/lib/repositories/crm-repository";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { getDateFilter, computeRepPerformance } from "@/features/crm/rules";
import { ReportNav } from "@/components/crm/report-nav";
import { Download, Trophy, Handshake, Phone, Activity, Star } from "lucide-react";

type Period = "all" | "30d" | "90d";

export default function PerformanceReportPage() {
  const { data: deals, error: dealsError } = useCrmDealsAll();
  const [period, setPeriod] = useState<Period>("all");

  const { data: allActivities } = useOrgQuery("crm-all-activities", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId, 1000)
  );

  const dateFilter = useMemo(() => getDateFilter(period), [period]);

  const filteredDeals = useMemo(
    () =>
      (deals ?? []).filter((d) => {
        if (!dateFilter) return true;
        return new Date(d.created_at) >= dateFilter;
      }),
    [deals, dateFilter]
  );

  const filteredActivities = useMemo(
    () =>
      (allActivities ?? []).filter((a) => {
        if (!dateFilter) return true;
        return new Date(a.created_at) >= dateFilter;
      }),
    [allActivities, dateFilter]
  );

  // 担当者別パフォーマンス
  const repPerformance = useMemo(
    () => computeRepPerformance(filteredDeals, filteredActivities),
    [filteredDeals, filteredActivities]
  );

  // トップKPI
  const totalWonAmount = repPerformance.reduce((s, r) => s + r.wonAmount, 0);
  const totalDeals = repPerformance.reduce((s, r) => s + r.deals, 0);
  const totalActivities = repPerformance.reduce((s, r) => s + r.activities, 0);
  const topPerformer = repPerformance[0];

  const handleExportCSV = () => {
    exportToCSV(
      repPerformance.map((r) => ({
        name: r.name,
        deals: r.deals,
        won: r.won,
        lost: r.lost,
        winRate: r.winRate,
        wonAmount: r.wonAmount,
        totalAmount: r.totalAmount,
        activities: r.activities,
      })),
      [
        { key: "name", label: "担当者" },
        { key: "deals", label: "商談数" },
        { key: "won", label: "受注" },
        { key: "lost", label: "失注" },
        { key: "winRate", label: "勝率(%)" },
        { key: "wonAmount", label: "受注額" },
        { key: "totalAmount", label: "総パイプライン" },
        { key: "activities", label: "活動数" },
      ],
      csvFilenameWithDate("担当者パフォーマンス")
    );
  };

  return (
    <div className="flex flex-col bg-white">
      <PageHeader
        title="担当者パフォーマンス"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "商談管理", href: "/crm/deals" },
          { label: "レポート", href: "/crm/reports/forecast" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全期間</SelectItem>
                <SelectItem value="30d">直近30日</SelectItem>
                <SelectItem value="90d">直近90日</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} disabled={!deals}>
              <Download className="size-4 mr-1.5" />
              CSV出力
            </Button>
          </div>
        }
      />
      {dealsError && <QueryErrorBanner error={dealsError} />}
      <ReportNav />

      <PageContent>
        <div className="space-y-6">
          {/* トップKPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Trophy} label="受注合計" value={`¥${totalWonAmount.toLocaleString()}`} />
            <KpiCard icon={Handshake} label="商談数" value={totalDeals} suffix="件" />
            <KpiCard icon={Phone} label="活動数" value={totalActivities} suffix="件" />
            <KpiCard
              icon={Star}
              label="トップ"
              value={topPerformer?.name ?? "—"}
              sub={topPerformer ? `¥${topPerformer.wonAmount.toLocaleString()}` : ""}
            />
          </div>

          {/* 担当者テーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4" />
                担当者別パフォーマンス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2 font-medium">担当者</th>
                      <th className="text-right px-4 py-2 font-medium">商談</th>
                      <th className="text-right px-4 py-2 font-medium">受注</th>
                      <th className="text-right px-4 py-2 font-medium">失注</th>
                      <th className="text-right px-4 py-2 font-medium">勝率</th>
                      <th className="text-right px-4 py-2 font-medium">受注額</th>
                      <th className="text-right px-4 py-2 font-medium">活動数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          データなし
                        </td>
                      </tr>
                    ) : (
                      repPerformance.map((r, i) => {
                        const topWon = repPerformance[0]?.wonAmount ?? 0;
                        const isTop =
                          repPerformance.length > 1 && topWon > 0 && r.wonAmount === topWon;
                        return (
                          <tr key={`perf-${i}`} className="border-b hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {isTop && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-yellow-100 text-yellow-800"
                                  >
                                    1位
                                  </Badge>
                                )}
                                <span className="font-medium">{r.name || "?"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{r.deals}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-600">
                              {r.won}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-500">
                              {r.lost}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span
                                className={cn(
                                  "tabular-nums font-medium",
                                  r.winRate >= 50 ? "text-green-600" : "text-muted-foreground"
                                )}
                              >
                                {r.won + r.lost > 0 ? `${r.winRate}%` : "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold">
                              ¥{r.wonAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{r.activities}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 活動量ランキング */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">活動量ランキング</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...repPerformance]
                  .sort((a, b) => b.activities - a.activities)
                  .slice(0, 10)
                  .map((r) => {
                    const maxAct = Math.max(...repPerformance.map((p) => p.activities), 1);
                    return (
                      <div key={r.name} className="flex items-center gap-3">
                        <span className="text-sm w-24 truncate shrink-0">{r.name}</span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(r.activities / maxAct) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-14 text-right tabular-nums">
                          {r.activities}件
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
}: {
  icon: typeof Trophy;
  label: string;
  value: number | string;
  suffix?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold tabular-nums">{value}</span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
