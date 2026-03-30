"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as leaveRepository from "@/lib/repositories/leave-repository";
import type { LeaveBalance } from "@/types/database";

type MemberRow = {
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    hire_date: string | null;
  };
};

export function useLeave() {
  const {
    data: balances,
    error: balancesError,
    mutate: mutateBalances,
  } = useOrgQuery<LeaveBalance[]>("leave-balances", (orgId) =>
    leaveRepository.findBalances(getSupabase(), orgId)
  );

  const { data: members } = useOrgQuery<MemberRow[]>("members", (orgId) =>
    leaveRepository.findMembers(getSupabase(), orgId)
  );

  const updateBalance = async (
    id: string,
    data: {
      granted_days: number;
      used_days: number;
      carried_over_days: number;
      expired_days: number;
      grant_date: string;
      expiry_date: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await leaveRepository.updateBalance(getSupabase(), id, data);
      await mutateBalances();
      return { success: true };
    } catch {
      return { success: false, error: "更新に失敗しました" };
    }
  };

  const grantManual = async (
    organizationId: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await leaveRepository.upsertBalance(getSupabase(), data);
      await mutateBalances();
      return { success: true };
    } catch {
      return { success: false, error: "付与に失敗しました" };
    }
  };

  const grantAuto = async (
    rows: Record<string, unknown>[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await leaveRepository.upsertBalances(getSupabase(), rows);
      await mutateBalances();
      return { success: true };
    } catch {
      return { success: false, error: "自動付与に失敗しました" };
    }
  };

  return {
    balances,
    balancesError,
    mutateBalances,
    members,
    updateBalance,
    grantManual,
    grantAuto,
  };
}
