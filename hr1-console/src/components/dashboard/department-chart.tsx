"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Building2 } from "lucide-react";
import type { DepartmentStat } from "@/types/dashboard";

export type { DepartmentStat };

interface DepartmentChartProps {
  data: DepartmentStat[];
}

const BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const apps = payload.find((p) => p.name === "応募数");
  const offered = payload.find((p) => p.name === "内定数");
  const rate =
    apps && offered && apps.value > 0 ? Math.round((offered.value / apps.value) * 100) : null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums">{item.value}件</span>
          </div>
        ))}
        {rate !== null && (
          <div className="border-t pt-1 mt-1">
            <div className="flex items-center justify-between gap-6">
              <span className="text-xs text-muted-foreground">内定率</span>
              <span className="text-xs font-semibold tabular-nums text-emerald-600">{rate}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DepartmentChart({ data }: DepartmentChartProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-[15px] font-semibold">部署別採用状況</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[11px] text-muted-foreground">応募数</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">内定数</span>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="applications" name="応募数" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} opacity={0.85} />
                ))}
              </Bar>
              <Bar
                dataKey="offered"
                name="内定数"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
