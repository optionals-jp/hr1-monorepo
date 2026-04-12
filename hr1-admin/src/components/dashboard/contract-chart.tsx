"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths } from "date-fns";

interface MonthlyData {
  month: string;
  contracts: number;
}

export function ContractChart() {
  const { data } = useQuery<MonthlyData[]>("admin-contract-trend", async () => {
    const { data: contracts } = await getSupabase()
      .from("contracts")
      .select("start_date")
      .order("start_date", { ascending: true });

    if (!contracts) return [];

    const now = new Date();
    const monthMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      monthMap.set(format(d, "yyyy/MM"), 0);
    }

    for (const c of contracts) {
      const key = format(new Date(c.start_date), "yyyy/MM");
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      }
    }

    return Array.from(monthMap.entries()).map(([month, contracts]) => ({
      month,
      contracts,
    }));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">月別新規契約数</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip />
              <Bar
                dataKey="contracts"
                name="新規契約"
                fill="oklch(0.55 0.18 250)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
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
