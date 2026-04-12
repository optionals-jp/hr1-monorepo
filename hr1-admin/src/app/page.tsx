"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import { ContractChart } from "@/components/dashboard/contract-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentChanges } from "@/components/dashboard/recent-changes";
import { Building2, Users, CreditCard, TrendingUp, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Stats {
  activeContracts: number;
  trialContracts: number;
  totalEmployees: number;
  mrr: number;
}

interface KpiCardDef {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  accent: string;
}

/* ------------------------------------------------------------------ */
/*  KpiCard                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({ card }: { card: KpiCardDef }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accent}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-[13px] font-medium text-muted-foreground">
          {card.title}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
          <card.icon className={`h-4 w-4 ${card.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">{card.value}</div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const {
    data: stats,
    error: statsError,
    mutate: mutateStats,
  } = useQuery<Stats>("admin-dashboard-stats", async () => {
    const [activeRes, trialRes, allActiveRes] = await Promise.all([
      getSupabase()
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      getSupabase()
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("status", "trial"),
      getSupabase()
        .from("contracts")
        .select("contracted_employees, monthly_price")
        .in("status", ["active", "trial"]),
    ]);

    const activeContracts = activeRes.count ?? 0;
    const trialContracts = trialRes.count ?? 0;
    const contracts = allActiveRes.data ?? [];
    const totalEmployees = contracts.reduce((sum, c) => sum + (c.contracted_employees ?? 0), 0);
    const mrr = contracts.reduce((sum, c) => sum + (c.monthly_price ?? 0), 0);

    return { activeContracts, trialContracts, totalEmployees, mrr };
  });

  const d = stats ?? {
    activeContracts: 0,
    trialContracts: 0,
    totalEmployees: 0,
    mrr: 0,
  };

  const cards: KpiCardDef[] = [
    {
      title: "契約企業数",
      value: d.activeContracts.toLocaleString(),
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      accent: "bg-blue-500",
    },
    {
      title: "トライアル企業数",
      value: d.trialContracts.toLocaleString(),
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
      accent: "bg-amber-500",
    },
    {
      title: "契約社員数合計",
      value: d.totalEmployees.toLocaleString(),
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      accent: "bg-emerald-500",
    },
    {
      title: "MRR",
      value: `¥${formatCurrency(d.mrr)}`,
      icon: CreditCard,
      color: "text-violet-600",
      bg: "bg-violet-50",
      accent: "bg-violet-500",
    },
  ];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="HR1 契約状況の概要"
        border={false}
        sticky={false}
      />
      <PageContent>
        <QueryErrorBanner error={statsError} onRetry={() => mutateStats()} />

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <KpiCard key={card.title} card={card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ContractChart />
            <RevenueChart />
          </div>

          <RecentChanges />
        </div>
      </PageContent>
    </>
  );
}
