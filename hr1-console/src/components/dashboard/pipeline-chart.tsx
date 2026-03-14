"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, GitCommitHorizontal } from "lucide-react";

export interface PipelineStage {
  name: string;
  count: number;
}

interface PipelineChartProps {
  data: PipelineStage[];
}

const COLORS = [
  { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  { bar: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  { bar: "bg-violet-500", badge: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { bar: "bg-purple-500", badge: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  { bar: "bg-fuchsia-500", badge: "bg-fuchsia-50 text-fuchsia-700", dot: "bg-fuchsia-500" },
  { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
];

export function PipelineChart({ data }: PipelineChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">選考パイプライン</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">各ステージの候補者数と通過率</p>
          </div>
          {data.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              全{data[0]?.count ?? 0}件
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitCommitHorizontal className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.map((stage, index) => {
              const percentage = Math.round((stage.count / maxCount) * 100);
              const conversionRate =
                index > 0 && data[index - 1].count > 0
                  ? Math.round((stage.count / data[index - 1].count) * 100)
                  : null;
              const color = COLORS[index % COLORS.length];

              return (
                <div key={index}>
                  {/* ステージ間の矢印 */}
                  {index > 0 && (
                    <div className="flex items-center justify-center py-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground/50">
                        <ArrowDown className="h-3 w-3" />
                        {conversionRate !== null && (
                          <span className="text-[10px] font-medium tabular-nums">
                            {conversionRate}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* バー */}
                  <div className="group relative">
                    <div className="h-9 w-full rounded-lg bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-lg ${color.bar} transition-all duration-700 ease-out`}
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                    {/* ラベルオーバーレイ */}
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${color.dot} shrink-0`} />
                        <span className="text-xs font-medium text-foreground/90">{stage.name}</span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.badge} tabular-nums`}
                      >
                        {stage.count}件
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
  );
}
