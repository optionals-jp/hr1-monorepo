import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { formatJpy } from "@/features/crm/rules";
import type { useCrmReportsPage } from "@/features/crm/hooks/use-crm-reports-page";

type H = ReturnType<typeof useCrmReportsPage>;

const EmptyRow = ({ cols }: { cols: number }) => (
  <TableRow>
    <TableCell colSpan={cols} className="text-center text-muted-foreground py-8">
      データがありません
    </TableCell>
  </TableRow>
);

function KpiCard({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function WinRateTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; name: string; won: number; lost: number; total: number; rate: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.includes("金額") ? "金額帯" : "担当者"}</TableHead>
              <TableHead className="text-right">受注</TableHead>
              <TableHead className="text-right">失注</TableHead>
              <TableHead className="text-right">合計</TableHead>
              <TableHead className="text-right">受注率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow cols={5} />
            ) : (
              rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right text-green-600">{r.won}</TableCell>
                  <TableCell className="text-right text-red-600">{r.lost}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.rate >= 50 ? "secondary" : "destructive"}>{r.rate}%</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- Win/Loss ---------- */

export function WinLossTab({ h }: { h: H }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="受注率"
          value={`${h.wlSummary.winRate}%`}
          sub={`${h.wlSummary.closedCount}件中 ${h.wlSummary.wonDeals.length}件受注`}
        />
        <KpiCard
          label="受注金額"
          value={formatJpy(h.wlSummary.wonAmount)}
          valueClass="text-green-600"
          sub={`平均 ${formatJpy(h.wlSummary.avgWonAmount)}`}
        />
        <KpiCard
          label="失注金額"
          value={formatJpy(h.wlSummary.lostAmount)}
          valueClass="text-red-600"
          sub={`平均 ${formatJpy(h.wlSummary.avgLostAmount)}`}
        />
        <KpiCard
          label="クローズ件数"
          value={`${h.wlSummary.closedCount}件`}
          sub={`受注 ${h.wlSummary.wonDeals.length} / 失注 ${h.wlSummary.lostDeals.length}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">月次トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          {h.monthlyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">データがありません</p>
          ) : (
            <div className="space-y-2">
              {h.monthlyTrend.map((m) => {
                const total = m.won + m.lost;
                const wonPct = total > 0 ? (m.won / total) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 flex h-5 rounded overflow-hidden bg-muted">
                      {m.won > 0 && (
                        <div className="h-full bg-green-500" style={{ width: `${wonPct}%` }} />
                      )}
                      {m.lost > 0 && (
                        <div className="h-full bg-red-400" style={{ width: `${100 - wonPct}%` }} />
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

      <WinRateTable
        title="金額帯別受注率"
        rows={h.brackets.map((b) => ({
          key: b.label,
          name: b.label,
          won: b.won,
          lost: b.lost,
          total: b.total,
          rate: b.rate,
        }))}
      />
      <WinRateTable
        title="担当者別受注率"
        rows={h.repWinRates.map((r) => ({
          key: r.name,
          name: r.name,
          won: r.won,
          lost: r.lost,
          total: r.total,
          rate: r.rate,
        }))}
      />
    </div>
  );
}

/* ---------- Performance ---------- */

export function PerformanceTab({ h }: { h: H }) {
  const maxAct = Math.max(...h.repPerformance.map((rp) => rp.activities), 1);
  return (
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
              {h.repPerformance.length === 0 ? (
                <EmptyRow cols={7} />
              ) : (
                h.repPerformance.map((r) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">担当者別活動量</CardTitle>
        </CardHeader>
        <CardContent>
          {h.repPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">データがありません</p>
          ) : (
            <div className="space-y-3">
              {h.repPerformance
                .filter((r) => r.activities > 0)
                .map((r) => (
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
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Pipeline ---------- */

export function PipelineTab({ h }: { h: H }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="商談数" value={String(h.velocity.dealCount)} />
        <KpiCard label="平均金額" value={formatJpy(h.velocity.avgAmount)} />
        <KpiCard label="受注率" value={`${h.velocity.winRate}%`} />
        <KpiCard label="平均日数" value={`${h.velocity.avgDays}日`} />
        <KpiCard label="ベロシティ" value={formatJpy(h.velocity.velocity)} sub="/ 日" />
      </div>

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
              {h.stageMetrics.map((sm) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ステージ間コンバージョン率</CardTitle>
        </CardHeader>
        <CardContent>
          {h.conversionRates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">データがありません</p>
          ) : (
            <div className="flex items-center justify-center gap-2 flex-wrap py-4">
              {h.conversionRates.map((cr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="px-3 py-2 rounded-lg border text-sm font-medium"
                    style={{ borderColor: cr.fromColor }}
                  >
                    {cr.from}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold">{cr.rate}%</span>
                    <span className="text-muted-foreground">{"\u2192"}</span>
                  </div>
                  {i === h.conversionRates.length - 1 && (
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
  );
}
