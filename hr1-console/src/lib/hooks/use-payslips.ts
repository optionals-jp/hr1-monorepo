"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import * as payslipRepository from "@/lib/repositories/payslip-repository";
import type { Payslip } from "@/types/database";

interface MemberRow {
  user_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function usePayslips() {
  const { organization } = useOrg();
  const {
    data: payslips,
    error: payslipsError,
    mutate,
  } = useOrgQuery<Payslip[]>("payslips", (orgId) =>
    payslipRepository.findByOrg(getSupabase(), orgId)
  );

  const { data: members } = useOrgQuery<MemberRow[]>("members", (orgId) =>
    payslipRepository.findMembers(getSupabase(), orgId)
  );

  const createPayslip = async (
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await payslipRepository.create(getSupabase(), payload);
      await mutate();
      return { success: true };
    } catch {
      return { success: false, error: "保存に失敗しました" };
    }
  };

  const updatePayslip = async (
    id: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織情報がありません" };
    try {
      await payslipRepository.update(getSupabase(), id, organization.id, payload);
      await mutate();
      return { success: true };
    } catch {
      return { success: false, error: "保存に失敗しました" };
    }
  };

  const deletePayslip = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織情報がありません" };
    try {
      await payslipRepository.remove(getSupabase(), id, organization.id);
      await mutate();
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    }
  };

  const uploadCsv = async (
    organizationId: string,
    csvPreview: {
      email: string;
      year: number;
      month: number;
      base_salary: number;
      gross_pay: number;
      net_pay: number;
    }[]
  ): Promise<{ success: boolean; count?: number; errors?: string[]; error?: string }> => {
    try {
      const emails = [...new Set(csvPreview.map((r) => r.email))];
      const profiles = await payslipRepository.findProfilesByEmails(getSupabase(), emails);

      const emailToId = new Map<string, string>();
      for (const p of profiles) {
        emailToId.set(p.email, p.id);
      }

      const errors: string[] = [];
      const records: Record<string, unknown>[] = [];

      for (const row of csvPreview) {
        const userId = emailToId.get(row.email);
        if (!userId) {
          errors.push(`${row.email}: ユーザーが見つかりません`);
          continue;
        }
        records.push({
          organization_id: organizationId,
          user_id: userId,
          year: row.year,
          month: row.month,
          base_salary: row.base_salary,
          allowances: [],
          deductions: [],
          gross_pay: row.gross_pay,
          net_pay: row.net_pay,
          note: null,
          updated_at: new Date().toISOString(),
        });
      }

      if (errors.length > 0 && records.length === 0) {
        return { success: false, errors };
      }

      await payslipRepository.upsertBatch(getSupabase(), records);
      await mutate();
      return {
        success: true,
        count: records.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch {
      return { success: false, error: "取り込みに失敗しました" };
    }
  };

  return {
    payslips,
    payslipsError,
    mutate,
    members,
    createPayslip,
    updatePayslip,
    deletePayslip,
    uploadCsv,
  };
}
