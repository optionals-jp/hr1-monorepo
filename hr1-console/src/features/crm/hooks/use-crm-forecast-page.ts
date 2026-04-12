"use client";

import { useState, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchDeals } from "@/lib/repositories/crm-repository";
import {
  computeCategorySummary,
  computeChartData,
  computeRepForecast,
  getDateFilter,
} from "@/features/crm/rules";
import type { BcDeal } from "@/types/database";

export function useCrmForecastPage() {
  const [periodMode, setPeriodMode] = useState<"monthly" | "quarterly">("monthly");
  const [period, setPeriod] = useState("6m");

  const { data: allDeals } = useOrgQuery<BcDeal[]>("crm-deals-forecast", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const {
    deals,
    categorySummary,
    chartData,
    repForecast,
    totalWeighted,
    totalAmount,
    maxPeriodTotal,
  } = useMemo(() => {
    const dateFilter = getDateFilter(period);
    const filteredDeals = (allDeals ?? []).filter((d) => {
      if (!dateFilter) return true;
      return new Date(d.created_at) >= dateFilter;
    });

    const catSummary = computeCategorySummary(filteredDeals);
    const chart = computeChartData(filteredDeals, periodMode);
    const rep = computeRepForecast(filteredDeals);

    const totalW = Object.values(catSummary).reduce((s, c) => s + c.weighted, 0);
    const totalA = Object.values(catSummary).reduce((s, c) => s + c.amount, 0);
    const maxPT = Math.max(...chart.map((d) => d.total), 1);

    return {
      deals: filteredDeals,
      categorySummary: catSummary,
      chartData: chart,
      repForecast: rep,
      totalWeighted: totalW,
      totalAmount: totalA,
      maxPeriodTotal: maxPT,
    };
  }, [allDeals, period, periodMode]);

  return {
    periodMode,
    setPeriodMode,
    period,
    setPeriod,
    deals,
    categorySummary,
    chartData,
    repForecast,
    totalWeighted,
    totalAmount,
    maxPeriodTotal,
  };
}
