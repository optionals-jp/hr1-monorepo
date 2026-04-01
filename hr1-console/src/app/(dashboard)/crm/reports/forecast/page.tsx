"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
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
import type { BcDeal } from "@/types/database";
import {
  Download,
  TrendingUp,
  Target,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// 予測カテゴリの定義
type ForecastCategory = "pipeline" | "bestCase" | "commit" | "closed";

const FORECAST_CATEGORIES: {
  key: ForecastCategory;
  label: string;
  color: string;
  icon: typeof TrendingUp;
  range: string;
}[] = [
  { key: "pipeline", label: "パイプライン", color: "#94a3b8", icon: AlertCircle, range: "0-49%" },
  { key: "bestCase", label: "ベストケース", color: "#eab308", icon: TrendingUp, range: "50-74%" },
  { key: "commit", label: "コミット", color: "#3b82f6", icon: Target, range: "75-99%" },
  { key: "closed", label: "受注済", color: "#22c55e", icon: CheckCircle, range: "100%" },
];

function categorizeDeal(deal: BcDeal): ForecastCategory {
  if (deal.status === "won") return "closed";
  const prob = deal.probability ?? 0;
  if (prob >= 75) return "commit";
  if (prob >= 50) return "bestCase";
  return "pipeline";
}

function getWeightedAmount(deal: BcDeal): number {
  if (deal.status === "won") return deal.amount ?? 0;
  return ((deal.amount ?? 0) * (deal.probability ?? 0)) / 100;
}

function getMonthKey(dateStr: string | null): string {
  if (!dateStr) return "未定";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getQuarterKey(dateStr: string | null): string {
  if (!dateStr) return "未定";
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

interface MonthlyForecast {
  month: string;
  pipeline: number;
  bestCase: number;
  commit: number;
  closed: number;
  total: number;
}

type PeriodMode = "monthly" | "quarterly";

export default function ForecastReportPage() {
  const { data: deals, error } = useCrmDealsAll();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");

  // 有効な商談のみ（失注除外）
  const activeDeals = useMemo(() => (deals ?? []).filter((d) => d.status !== "lost"), [deals]);

  // カテゴリ別サマリー
  const categorySummary = useMemo(() => {
    const summary: Record<ForecastCategory, { count: number; amount: number; weighted: number }> = {
      pipeline: { count: 0, amount: 0, weighted: 0 },
      bestCase: { count: 0, amount: 0, weighted: 0 },
      commit: { count: 0, amount: 0, weighted: 0 },
      closed: { count: 0, amount: 0, weighted: 0 },
    };
    for (const deal of activeDeals) {
      const cat = categorizeDeal(deal);
      summary[cat].count++;
      summary[cat].amount += deal.amount ?? 0;
      summary[cat].weighted += getWeightedAmount(deal);
    }
    return summary;
  }, [activeDeals]);

  const totalWeighted = useMemo(
    () => Object.values(categorySummary).reduce((sum, s) => sum + s.weighted, 0),
    [categorySummary]
  );

  // 期間別集計（グラフ用）
  const chartData = useMemo(() => {
    const getKey = periodMode === "monthly" ? getMonthKey : getQuarterKey;
    const map = new Map<string, MonthlyForecast>();

    for (const deal of activeDeals) {
      const key = getKey(deal.expected_close_date);
      if (!map.has(key)) {
        map.set(key, { month: key, pipeline: 0, bestCase: 0, commit: 0, closed: 0, total: 0 });
      }
      const entry = map.get(key)!;
      const cat = categorizeDeal(deal);
      const weighted = getWeightedAmount(deal);
      entry[cat] += weighted;
      entry.total += weighted;
    }

    // ソート（「未定」は末尾）
    return Array.from(map.values()).sort((a, b) => {
      if (a.month === "未定") return 1;
      if (b.month === "未定") return -1;
      return a.month.localeCompare(b.month);
    });
  }, [activeDeals, periodMode]);

  // 担当者別集計
  const repData = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        pipeline: number;
        bestCase: number;
        commit: number;
        closed: number;
        total: number;
      }
    >();
    for (const deal of activeDeals) {
      const name = deal.profiles?.display_name ?? "未割当";
      if (!map.has(name)) {
        map.set(name, { name, pipeline: 0, bestCase: 0, commit: 0, closed: 0, total: 0 });
      }
      const entry = map.get(name)!;
      const cat = categorizeDeal(deal);
      const weighted = getWeightedAmount(deal);
      entry[cat] += weighted;
      entry.total += weighted;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeDeals]);

  const handleExportCSV = () => {
    const rows = activeDeals.map((d) => ({
      title: d.title,
      company: d.bc_companies?.name ?? "",
      stage: d.stage,
      status: d.status,
      amount: d.amount ?? 0,
      probability: d.probability ?? 0,
      weighted: getWeightedAmount(d),
      category: FORECAST_CATEGORIES.find((c) => c.key === categorizeDeal(d))?.label ?? "",
      expected_close_date: d.expected_close_date ?? "",
      assigned_to: d.profiles?.display_name ?? "",
    }));

    exportToCSV(
      rows,
      [
        { key: "title", label: "商談名" },
        { key: "company", label: "企業名" },
        { key: "stage", label: "ステージ" },
        { key: "status", label: "ステータス" },
        { key: "amount", label: "金額" },
        { key: "probability", label: "確度(%)" },
        { key: "weighted", label: "加重金額" },
        { key: "category", label: "予測カテゴリ" },
        { key: "expected_close_date", label: "見込み日" },
        { key: "assigned_to", label: "担当者" },
      ],
      csvFilenameWithDate("売上予測")
    );
  };

  return (
    <div className="flex flex-col bg-white">
      <PageHeader
        title="売上予測レポート"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Button variant="outline" onClick={handleExportCSV} disabled={!deals}>
            <Download className="size-4 mr-1.5" />
            CSV出力
          </Button>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <div className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">期間表示</span>
          <Select value={periodMode} onValueChange={(v) => v && setPeriodMode(v as PeriodMode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">月別</SelectItem>
              <SelectItem value="quarterly">四半期別</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </StickyFilterBar>

      <PageContent>
        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {FORECAST_CATEGORIES.map((cat) => {
            const s = categorySummary[cat.key];
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="size-4" style={{ color: cat.color }} />
                  <p className="text-sm font-medium">{cat.label}</p>
                  <span className="text-xs text-muted-foreground">({cat.range})</span>
                </div>
                <p className="text-xl font-bold tabular-nums">¥{s.weighted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.count}件 / 総額¥{s.amount.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>

        {/* 加重合計 */}
        <div className="rounded-lg border bg-muted/30 p-4 mb-6">
          <p className="text-sm text-muted-foreground">加重売上予測合計</p>
          <p className="text-2xl font-bold tabular-nums">¥{totalWeighted.toLocaleString()}</p>
        </div>

        {/* 期間別グラフ */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="text-sm font-semibold mb-4">
            {periodMode === "monthly" ? "月別" : "四半期別"}売上予測
          </h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">データがありません</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 16, bottom: 0 }}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    `¥${Number(value).toLocaleString()}`,
                    name as string,
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="closed"
                  name="受注済"
                  fill="#22c55e"
                  stackId="forecast"
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey="commit" name="コミット" fill="#3b82f6" stackId="forecast" />
                <Bar dataKey="bestCase" name="ベストケース" fill="#eab308" stackId="forecast" />
                <Bar
                  dataKey="pipeline"
                  name="パイプライン"
                  fill="#94a3b8"
                  stackId="forecast"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 担当者別テーブル */}
        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="text-sm font-semibold">担当者別予測</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-2 font-medium">担当者</th>
                  <th className="text-right px-4 py-2 font-medium">パイプライン</th>
                  <th className="text-right px-4 py-2 font-medium">ベストケース</th>
                  <th className="text-right px-4 py-2 font-medium">コミット</th>
                  <th className="text-right px-4 py-2 font-medium">受注済</th>
                  <th className="text-right px-4 py-2 font-medium">合計（加重）</th>
                </tr>
              </thead>
              <tbody>
                {repData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  repData.map((rep) => (
                    <tr key={rep.name} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{rep.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        ¥{rep.pipeline.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        ¥{rep.bestCase.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        ¥{rep.commit.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        ¥{rep.closed.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">
                        ¥{rep.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
