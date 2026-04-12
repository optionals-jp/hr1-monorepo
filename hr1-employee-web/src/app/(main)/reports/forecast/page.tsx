"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { useCrmDealsAll } from "@/lib/hooks/use-crm";
import { exportToCSV, csvFilenameWithDate } from "@hr1/shared-ui";
import { ReportNav } from "@/components/crm/report-nav";
import {
  categorizeDeal,
  getWeightedAmount,
  computeCategorySummary,
  computeChartData,
  computeRepForecast,
  type ForecastCategory,
} from "@/features/crm/rules";
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

type PeriodMode = "monthly" | "quarterly";

export default function ForecastReportPage() {
  const { data: deals, error } = useCrmDealsAll();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");

  // 有効な商談のみ（失注除外）
  const activeDeals = useMemo(() => (deals ?? []).filter((d) => d.status !== "lost"), [deals]);

  // カテゴリ別サマリー
  const categorySummary = useMemo(() => computeCategorySummary(activeDeals), [activeDeals]);

  const totalWeighted = useMemo(
    () => Object.values(categorySummary).reduce((sum, s) => sum + s.weighted, 0),
    [categorySummary]
  );

  // 期間別集計（グラフ用）
  const chartData = useMemo(
    () => computeChartData(activeDeals, periodMode),
    [activeDeals, periodMode]
  );

  // 担当者別集計
  const repData = useMemo(() => computeRepForecast(activeDeals), [activeDeals]);

  const handleExportCSV = () => {
    const rows = activeDeals.map((d) => ({
      title: d.title,
      company: d.crm_companies?.name ?? "",
      stage: d.crm_pipeline_stages?.name ?? "",
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
        breadcrumb={[{ label: "商談管理", href: "/deals" }]}
        action={
          <Button variant="outline" onClick={handleExportCSV} disabled={!deals}>
            <Download className="size-4 mr-1.5" />
            CSV出力
          </Button>
        }
      />
      {error && <QueryErrorBanner error={error} />}
      <ReportNav />

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
        <h2 className="text-sm font-semibold mb-2">担当者別予測</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>担当者</TableHead>
              <TableHead className="text-right">パイプライン</TableHead>
              <TableHead className="text-right">ベストケース</TableHead>
              <TableHead className="text-right">コミット</TableHead>
              <TableHead className="text-right">受注済</TableHead>
              <TableHead className="text-right">合計（加重）</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              repData.map((rep) => (
                <TableRow key={rep.name}>
                  <TableCell className="font-medium">{rep.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{rep.pipeline.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{rep.bestCase.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{rep.commit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{rep.closed.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    ¥{rep.total.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </PageContent>
    </div>
  );
}
