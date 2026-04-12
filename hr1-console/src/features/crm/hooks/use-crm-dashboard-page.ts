"use client";

import { useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchDeals,
  fetchRecentActivities,
  fetchUpcomingTodos,
  toggleTodoComplete,
} from "@/lib/repositories/crm-repository";
import {
  computeCrmKpi,
  computeStageFunnel,
  formatDate,
  formatDateTime,
  isOverdue,
} from "@/features/crm/rules";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";

export function useCrmDashboardPage() {
  const { organization } = useOrg();
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  const { data: deals } = useOrgQuery("crm-dashboard-deals", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: activities } = useOrgQuery("crm-dashboard-activities", (orgId) =>
    fetchRecentActivities(getSupabase(), orgId, 10)
  );

  const { data: todos, mutate: mutateTodos } = useOrgQuery("crm-dashboard-todos", (orgId) =>
    fetchUpcomingTodos(getSupabase(), orgId)
  );

  const kpi = deals ? computeCrmKpi(deals) : null;
  const funnel = kpi ? computeStageFunnel(stages, kpi.openDeals) : [];
  const maxFunnelAmount = Math.max(...funnel.map((s) => s.amount), 1);

  const handleToggleTodo = useCallback(
    async (
      todoId: string,
      currentCompleted: boolean
    ): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false };
      try {
        await toggleTodoComplete(getSupabase(), todoId, organization.id, !currentCompleted);
        mutateTodos();
        return { success: true };
      } catch {
        return { success: false, error: "TODOの更新に失敗しました" };
      }
    },
    [organization, mutateTodos]
  );

  return {
    kpi,
    funnel,
    maxFunnelAmount,
    activities,
    todos,
    stages,
    handleToggleTodo,
    loading: !deals,
    formatDate,
    formatDateTime,
    isOverdue,
  };
}
