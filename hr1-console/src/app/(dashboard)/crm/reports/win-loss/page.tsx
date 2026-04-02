"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useCrmDealsAll } from "@/lib/hooks/use-crm";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { ReportNav } from "@/components/crm/report-nav";
import { Download, Trophy, XCircle, TrendingUp, ArrowRight } from "lucide-react";

type Period = "all" | "3m" | "6m" | "12m";

function getDateFilter(period: Period): Date | null {
  if (period === "all") return null;
  const d = new Date();
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  d.setMonth(d.getMonth() - months);
  return d;
}

export default function WinLossReportPage() {
  const { data: deals, error } = useCrmDealsAll();
  const [period, setPeriod] = useState<Period>("all");

  const dateFilter = getDateFilter(period);
  const filteredDeals = useMemo(
    () =>
      (deals ?? []).filter((d) => {
        if (!dateFilter) return true;
        return new Date(d.updated_at) >= dateFilter;
      }),
    [deals, dateFilter]
  );

  const wonDeals = useMemo(() => filteredDeals.filter((d) => d.status === "won"), [filteredDeals]);
  const lostDeals = useMemo(
    () => filteredDeals.filter((d) => d.status === "lost"),
    [filteredDeals]
  );
  const closedDeals = wonDeals.length + lostDeals.length;
  const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;
  const wonAmount = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const lostAmount = lostDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const avgWonAmount = wonDeals.length > 0 ? Math.round(wonAmount / wonDeals.length) : 0;
  const avgLostAmount = lostDeals.length > 0 ? Math.round(lostAmount / lostDeals.length) : 0;

  // 月別推移
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { month: string; won: number; lost: number }>();
    for (const d of [...wonDeals, ...lostDeals]) {
      const date = new Date(d.updated_at);
      const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { month: key, won: 0, lost: 0 });
      const entry = map.get(key)!;
      if (d.status === "won") entry.won++;
      else entry.lost++;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [wonDeals, lostDeals]);

  // 企業規模別（金額帯別）分析
  const amountBrackets = useMemo(() => {
    const brackets = [
      { label: "〜50万", min: 0, max: 500_000 },
      { label: "50万〜100万", min: 500_000, max: 1_000_000 },
      { label: "100万〜500万", min: 1_000_000, max: 5_000_000 },
      { label: "500万〜", min: 5_000_000, max: Infinity },
    ];
    return brackets.map((b) => {
      const bracketWon = wonDeals.filter(
        (d) => (d.amount ?? 0) >= b.min && (d.amount ?? 0) < b.max
      );
      const bracketLost = lostDeals.filter(
        (d) => (d.amount ?? 0) >= b.min && (d.amount ?? 0) < b.max
      );
      const total = bracketWon.length + bracketLost.length;
      return {
        ...b,
        won: bracketWon.length,
        lost: bracketLost.length,
        total,
        rate: total > 0 ? Math.round((bracketWon.length / total) * 100) : 0,
      };
    });
  }, [wonDeals, lostDeals]);

  // 担当者別勝率
  const repWinRates = useMemo(() => {
    const map = new Map<string, { name: string; won: number; lost: number }>();
    for (const d of [...wonDeals, ...lostDeals]) {
      const name = d.profiles?.display_name ?? "未割当";
      if (!map.has(name)) map.set(name, { name, won: 0, lost: 0 });
      const entry = map.get(name)!;
      if (d.status === "won") entry.won++;
      else entry.lost++;
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        total: r.won + r.lost,
        rate: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [wonDeals, lostDeals]);

  const handleExportCSV = () => {
    const rows = [...wonDeals, ...lostDeals].map((d) => ({
      title: d.title,
      company: d.bc_companies?.name ?? "",
      status: d.status === "won" ? "受注" : "失注",
      amount: d.amount ?? 0,
      assigned_to: d.profiles?.display_name ?? "",
      updated_at: d.updated_at,
    }));
    exportToCSV(
      rows,
      [
        { key: "title", label: "商談名" },
        { key: "company", label: "企業名" },
        { key: "status", label: "結果" },
        { key: "amount", label: "金額" },
        { key: "assigned_to", label: "担当者" },
        { key: "updated_at", label: "更新日" },
      ],
      csvFilenameWithDate("勝敗分析")
    );
  };

  return (
    <div className="flex flex-col bg-white">
      <PageHeader
        title="勝敗分析レポート"
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
                <SelectItem value="3m">直近3ヶ月</SelectItem>
                <SelectItem value="6m">直近6ヶ月</SelectItem>
                <SelectItem value="12m">直近12ヶ月</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} disabled={!deals}>
              <Download className="size-4 mr-1.5" />
              CSV出力
            </Button>
          </div>
        }
      />
      {error && <QueryErrorBanner error={error} />}
      <ReportNav />

      <PageContent>
        <div className="space-y-6">
          {/* サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={Trophy}
              iconColor="text-green-600"
              label="受注"
              value={wonDeals.length}
              suffix="件"
              sub={`¥${wonAmount.toLocaleString()}`}
            />
            <SummaryCard
              icon={XCircle}
              iconColor="text-red-500"
              label="失注"
              value={lostDeals.length}
              suffix="件"
              sub={`¥${lostAmount.toLocaleString()}`}
            />
            <SummaryCard
              icon={TrendingUp}
              iconColor="text-blue-600"
              label="勝率"
              value={winRate}
              suffix="%"
              sub={`${closedDeals}件中`}
            />
            <SummaryCard
              icon={ArrowRight}
              iconColor="text-muted-foreground"
              label="平均受注額"
              value={`¥${avgWonAmount.toLocaleString()}`}
              sub={`失注平均: ¥${avgLostAmount.toLocaleString()}`}
            />
          </div>

          {/* 月別推移 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">月別勝敗推移</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">データなし</p>
              ) : (
                <div className="space-y-2">
                  {monthlyTrend.map((m) => {
                    const total = m.won + m.lost;
                    const rate = total > 0 ? Math.round((m.won / total) * 100) : 0;
                    return (
                      <div key={m.month} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-muted-foreground shrink-0">{m.month}</span>
                        <div className="flex-1 flex h-6 rounded-md overflow-hidden bg-muted">
                          {m.won > 0 && (
                            <div
                              className="bg-green-500 flex items-center justify-center text-xs text-white"
                              style={{ width: `${(m.won / total) * 100}%` }}
                            >
                              {m.won}
                            </div>
                          )}
                          {m.lost > 0 && (
                            <div
                              className="bg-red-400 flex items-center justify-center text-xs text-white"
                              style={{ width: `${(m.lost / total) * 100}%` }}
                            >
                              {m.lost}
                            </div>
                          )}
                        </div>
                        <span className="w-12 text-right tabular-nums font-medium">{rate}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 金額帯別分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">金額帯別勝率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2 font-medium">金額帯</th>
                      <th className="text-right px-4 py-2 font-medium">受注</th>
                      <th className="text-right px-4 py-2 font-medium">失注</th>
                      <th className="text-right px-4 py-2 font-medium">勝率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amountBrackets.map((b) => (
                      <tr key={b.label} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{b.label}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-green-600">
                          {b.won}件
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-red-500">
                          {b.lost}件
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={cn(
                              "tabular-nums font-medium",
                              b.rate >= 50 ? "text-green-600" : "text-red-500"
                            )}
                          >
                            {b.total > 0 ? `${b.rate}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 担当者別勝率 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">担当者別勝率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {repWinRates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">データなし</p>
                ) : (
                  repWinRates.map((r, i) => (
                    <div key={`rep-${i}`} className="flex items-center gap-3">
                      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                        {(r.name || "?")[0]}
                      </div>
                      <span className="text-sm font-medium w-24 truncate shrink-0">{r.name}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden flex">
                        <div className="bg-green-500 h-full" style={{ width: `${r.rate}%` }} />
                        <div className="bg-red-400 h-full" style={{ width: `${100 - r.rate}%` }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right tabular-nums">
                        {r.rate}%
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {r.won}勝{r.lost}敗
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  iconColor,
  label,
  value,
  suffix,
  sub,
}: {
  icon: typeof Trophy;
  iconColor: string;
  label: string;
  value: number | string;
  suffix?: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("size-4", iconColor)} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
