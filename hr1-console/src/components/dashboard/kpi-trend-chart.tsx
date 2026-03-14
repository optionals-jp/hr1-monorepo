"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export interface KpiTrendPoint {
  month: string;
  applications: number;
  offered: number;
  withdrawn: number;
}

interface KpiTrendChartProps {
  data: KpiTrendPoint[];
}

const SERIES = [
  { key: "applications", name: "応募数", color: "#3b82f6", dotClass: "bg-blue-500" },
  { key: "offered", name: "内定数", color: "#22c55e", dotClass: "bg-emerald-500" },
  { key: "withdrawn", name: "辞退数", color: "#f97316", dotClass: "bg-orange-500" },
] as const;

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
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
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
      </div>
    </div>
  );
}

export function KpiTrendChart({ data }: KpiTrendChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">KPIトレンド推移</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">過去6ヶ月の月別推移</p>
          </div>
          {/* 凡例 */}
          <div className="flex items-center gap-3">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${s.dotClass}`} />
                <span className="text-[11px] text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOffered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWithdrawn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                allowDecimals={false}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="applications"
                name="応募数"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradApplications)"
                dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="offered"
                name="内定数"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradOffered)"
                dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="withdrawn"
                name="辞退数"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#gradWithdrawn)"
                dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
