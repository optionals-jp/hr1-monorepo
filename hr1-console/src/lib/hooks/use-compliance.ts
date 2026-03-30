"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/compliance-repository";

export function useComplianceAlerts() {
  return useOrgQuery("compliance-alerts", (orgId) => repository.findByOrg(getSupabase(), orgId));
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
