"use client";

import { useState, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import {
  fetchDeals,
  fetchRecentActivities,
  fetchStageHistory,
} from "@/lib/repositories/crm-repository";
import {
  computeWinLossSummary,
  computeMonthlyTrend,
  computeAmountBrackets,
  computeRepWinRates,
  computeRepPerformance,
  computeStageMetrics,
  computeConversionRates,
  computePipelineVelocity,
  getDateFilter,
} from "@/features/crm/rules";
import type { BcDeal, BcActivity, CrmDealStageHistory } from "@/types/database";

export type ReportTab = "winloss" | "performance" | "pipeline";

export function useCrmReportsPage() {
  const { data: pipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(pipeline);

  const [activeTab, setActiveTab] = useState<ReportTab>("winloss");
  const [period, setPeriod] = useState("6m");

  const { data: allDeals } = useOrgQuery<BcDeal[]>("crm-deals-reports", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: allActivities } = useOrgQuery<BcActivity[]>("crm-activities-reports", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId, 500)
  );

  const { data: stageHistory } = useOrgQuery<CrmDealStageHistory[]>(
    "crm-stage-history-reports",
    (orgId) => fetchStageHistory(getSupabase(), orgId)
  );

  const computed = useMemo(() => {
    const dateFilter = getDateFilter(period);
    const deals = (allDeals ?? []).filter((d) => {
      if (!dateFilter) return true;
      return new Date(d.created_at) >= dateFilter;
    });
    const activities = (allActivities ?? []).filter((a) => {
      if (!dateFilter) return true;
      return new Date(a.created_at) >= dateFilter;
    });

    // Win/Loss Analysis
    const wlSummary = computeWinLossSummary(deals);
    const monthlyTrend = computeMonthlyTrend(wlSummary.wonDeals, wlSummary.lostDeals);
    const brackets = computeAmountBrackets(wlSummary.wonDeals, wlSummary.lostDeals);
    const repWinRates = computeRepWinRates(wlSummary.wonDeals, wlSummary.lostDeals);

    // Performance
    const repPerformance = computeRepPerformance(deals, activities);

    // Pipeline Analysis
    const openDeals = deals.filter((d) => d.status === "open");
    const wonDeals = deals.filter((d) => d.status === "won");
    const stageMetrics = computeStageMetrics(stages, openDeals, stageHistory ?? []);
    const conversionRates = computeConversionRates(stages, stageMetrics);
    const velocity = computePipelineVelocity(deals, openDeals, wonDeals, stageMetrics);

    return {
      wlSummary,
      monthlyTrend,
      brackets,
      repWinRates,
      repPerformance,
      stageMetrics,
      conversionRates,
      velocity,
    };
  }, [allDeals, allActivities, stageHistory, stages, period]);

  return {
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    ...computed,
  };
}
