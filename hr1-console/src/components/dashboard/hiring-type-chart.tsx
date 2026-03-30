"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { HiringTypeStat } from "@/types/dashboard";

export type { HiringTypeStat };

interface HiringTypeChartProps {
  data: HiringTypeStat[];
}

const COLORS = [
  { fill: "#6366f1", dot: "bg-indigo-500" },
  { fill: "#f59e0b", dot: "bg-amber-500" },
  { fill: "#94a3b8", dot: "bg-slate-400" },
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: HiringTypeStat }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5 shadow-lg">
      <div className="flex items-center justify-between gap-6">
        <span className="text-xs text-muted-foreground">{item.payload.name}</span>
        <span className="text-xs font-semibold tabular-nums">{item.value}名</span>
      </div>
    </div>
  );
}

export function HiringTypeChart({ data }: HiringTypeChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base font-semibold">採用区分</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">新卒・中途の内訳</p>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length].fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {data.map((item, index) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                const color = COLORS[index % COLORS.length];
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{item.value}名</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
