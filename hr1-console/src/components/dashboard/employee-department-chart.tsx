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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export interface EmployeeDepartmentStat {
  department: string;
  count: number;
}

interface EmployeeDepartmentChartProps {
  data: EmployeeDepartmentStat[];
}

const BAR_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-xs text-muted-foreground">社員数</span>
        <span className="text-xs font-semibold tabular-nums">{payload[0].value}名</span>
      </div>
    </div>
  );
}

export function EmployeeDepartmentChart({ data }: EmployeeDepartmentChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base font-semibold">部署別社員数</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">部署ごとの社員の分布</p>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">データがありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
              <Bar dataKey="count" name="社員数" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
