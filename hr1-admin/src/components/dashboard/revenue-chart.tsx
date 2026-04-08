"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths } from "date-fns";

interface MonthlyRevenue {
  month: string;
  mrr: number;
}

export function RevenueChart() {
  const { data } = useQuery<MonthlyRevenue[]>(
    "admin-revenue-trend",
    async () => {
      const { data: contracts } = await getSupabase()
        .from("contracts")
        .select("start_date, monthly_price, status")
        .in("status", ["active", "trial"]);

      if (!contracts) return [];

      const now = new Date();
      const months: MonthlyRevenue[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthStr = format(d, "yyyy/MM");

        // この月末時点でアクティブだった契約のMRRを合計
        const mrr = contracts
          .filter((c) => new Date(c.start_date) <= monthEnd)
          .reduce((sum, c) => sum + (c.monthly_price ?? 0), 0);

        months.push({ month: monthStr, mrr });
      }

      return months;
    },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">MRR推移</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                formatter={(value) => [
                  `¥${Number(value).toLocaleString()}`,
                  "MRR",
                ]}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="oklch(0.55 0.18 250)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            データがありません
          </div>
        )}
      </CardContent>
    </Card>
  );
}
