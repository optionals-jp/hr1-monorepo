"use client";

import { useState, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/compliance-repository";

export function useComplianceAlerts() {
  return useOrgQuery("compliance-alerts", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useCompliancePage() {
  const { organization } = useOrg();
  const [running, setRunning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("unresolved");

  const { data: alerts, error: alertsError, mutate: mutateAlerts } = useComplianceAlerts();

  const filteredAlerts = useMemo(() => {
    let rows = alerts ?? [];
    if (filterStatus === "unresolved") {
      rows = rows.filter((a) => !a.is_resolved);
    } else if (filterStatus === "resolved") {
      rows = rows.filter((a) => a.is_resolved);
    }
    if (filterSeverity !== "all") {
      rows = rows.filter((a) => a.severity === filterSeverity);
    }
    if (filterType !== "all") {
      rows = rows.filter((a) => a.alert_type === filterType);
    }
    return rows;
  }, [alerts, filterSeverity, filterType, filterStatus]);

  const summary = useMemo(() => {
    const unresolved = (alerts ?? []).filter((a) => !a.is_resolved);
    return {
      critical: unresolved.filter((a) => a.severity === "critical").length,
      warning: unresolved.filter((a) => a.severity === "warning").length,
      info: unresolved.filter((a) => a.severity === "info").length,
    };
  }, [alerts]);

  const handleRunCheck = async (): Promise<{
    success: boolean;
    error?: string;
    count?: number;
  }> => {
    if (!organization) return { success: false, error: "組織が選択されていません" };
    setRunning(true);
    try {
      const result = await runComplianceCheck(organization.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      await mutateAlerts();
      return { success: true, count: result.count };
    } finally {
      setRunning(false);
    }
  };

  const handleResolve = async (alertId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await resolveAlert(alertId, organization!.id);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    await mutateAlerts();
    return { success: true };
  };

  return {
    alerts,
    alertsError,
    mutateAlerts,
    running,
    filterSeverity,
    setFilterSeverity,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filteredAlerts,
    summary,
    handleRunCheck,
    handleResolve,
  };
}

export async function runComplianceCheck(
  organizationId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const { data, error } = await repository.runCheck(getSupabase(), organizationId);
  if (error) return { success: false, error: "チェックに失敗しました" };
  return { success: true, count: data ?? 0 };
}

export async function resolveAlert(
  alertId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const userId = (await getSupabase().auth.getUser()).data.user?.id ?? null;
  const { error } = await repository.resolve(getSupabase(), alertId, organizationId, userId);
  if (error) return { success: false, error: "更新に失敗しました" };
  return { success: true };
}
