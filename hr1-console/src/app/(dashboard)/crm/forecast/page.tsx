"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
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
import { formatJpy } from "@/features/crm/rules";
import { useCrmForecastPage } from "@/features/crm/hooks/use-crm-forecast-page";

const categoryLabels: Record<string, string> = {
  pipeline: "パイプライン",
  bestCase: "ベストケース",
  commit: "コミット",
  closed: "受注済",
};

const categoryColors: Record<string, string> = {
  pipeline: "#94a3b8",
  bestCase: "#3b82f6",
  commit: "#f59e0b",
  closed: "#22c55e",
};

export default function ForecastPage() {
  const {
    periodMode,
    setPeriodMode,
    period,
    setPeriod,
    categorySummary,
    chartData,
    repForecast,
    totalWeighted,
    totalAmount,
    maxPeriodTotal,
  } = useCrmForecastPage();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="売上予測"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]}
        action={
          <div className="flex items-center gap-2">
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
            <Select
              value={periodMode}
              onValueChange={(v) => setPeriodMode(v as "monthly" | "quarterly")}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">月次</SelectItem>
                <SelectItem value="quarterly">四半期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        {/* Category Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["pipeline", "bestCase", "commit", "closed"] as const).map((cat) => (
            <Card key={cat}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColors[cat] }}
                  />
                  <span className="text-sm text-muted-foreground">{categoryLabels[cat]}</span>
                </div>
                <p className="text-xl font-bold">{formatJpy(categorySummary[cat].weighted)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {categorySummary[cat].count}件
                  </span>
                  <span className="text-xs text-muted-foreground">
                    合計 {formatJpy(categorySummary[cat].amount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total Forecast */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">加重パイプライン合計</p>
                <p className="text-3xl font-bold">{formatJpy(totalWeighted)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">パイプライン総額</p>
                <p className="text-xl font-semibold text-muted-foreground">
                  {formatJpy(totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Chart (Horizontal Stacked Bars) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {periodMode === "monthly" ? "月次" : "四半期"}予測
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">データがありません</p>
            ) : (
              <div className="space-y-3">
                {chartData.map((row) => (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-20 shrink-0">{row.month}</span>
                    <div className="flex-1 flex h-6 rounded overflow-hidden bg-muted">
                      {(["closed", "commit", "bestCase", "pipeline"] as const).map((cat) => {
                        const width = row.total > 0 ? (row[cat] / maxPeriodTotal) * 100 : 0;
                        if (width === 0) return null;
                        return (
                          <div
                            key={cat}
                            className="h-full transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: categoryColors[cat],
                            }}
                            title={`${categoryLabels[cat]}: ${formatJpy(row[cat])}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-sm font-medium w-24 text-right shrink-0">
                      {formatJpy(row.total)}
                    </span>
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  {(["closed", "commit", "bestCase", "pipeline"] as const).map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: categoryColors[cat] }}
                      />
                      <span className="text-xs text-muted-foreground">{categoryLabels[cat]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rep Forecast Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">担当者別予測</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>担当者</TableHead>
                  <TableHead className="text-right">パイプライン</TableHead>
                  <TableHead className="text-right">ベストケース</TableHead>
                  <TableHead className="text-right">コミット</TableHead>
                  <TableHead className="text-right">受注済</TableHead>
                  <TableHead className="text-right">合計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repForecast.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  repForecast.map((rep) => (
                    <TableRow key={rep.name}>
                      <TableCell className="font-medium">{rep.name}</TableCell>
                      <TableCell className="text-right">{formatJpy(rep.pipeline)}</TableCell>
                      <TableCell className="text-right">{formatJpy(rep.bestCase)}</TableCell>
                      <TableCell className="text-right">{formatJpy(rep.commit)}</TableCell>
                      <TableCell className="text-right">{formatJpy(rep.closed)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatJpy(rep.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
