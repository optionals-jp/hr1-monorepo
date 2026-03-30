"use client";

import { useCallback } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as shiftRepository from "@/lib/repositories/shift-repository";
import type { ShiftRequest, ShiftSchedule } from "@/types/database";
import { formatYearMonth } from "@/lib/utils";

type RequestWithProfile = ShiftRequest & {
  profiles: { display_name: string | null; email: string };
};

type ScheduleWithProfile = ShiftSchedule & {
  profiles: { display_name: string | null; email: string };
};

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

export function useShifts(year: number, month: number) {
  const ym = formatYearMonth(year, month);
  const totalDays = new Date(year, month, 0).getDate();

  const {
    data: requests,
    error: requestsError,
    mutate: mutateReqs,
  } = useOrgQuery<RequestWithProfile[]>(`shift-requests-${ym}`, (orgId) =>
    shiftRepository.findRequests(getSupabase(), orgId, ym, totalDays)
  );

  const { data: schedules, mutate: mutateSch } = useOrgQuery<ScheduleWithProfile[]>(
    `shift-schedules-${ym}`,
    (orgId) => shiftRepository.findSchedules(getSupabase(), orgId, ym, totalDays)
  );

  const { data: employees } = useOrgQuery<Employee[]>("shift-employees", (orgId) =>
    shiftRepository.findEmployees(getSupabase(), orgId)
  );

  const autoFill = useCallback(
    async (
      organizationId: string
    ): Promise<{ success: boolean; count?: number; error?: string }> => {
      if (!requests) return { success: false, error: "反映するデータがありません" };
      try {
        const { count } = await shiftRepository.autoFillFromRequests(
          getSupabase(),
          organizationId,
          requests
        );
        if (count === 0) return { success: false, error: "反映するデータがありません" };
        mutateSch();
        return { success: true, count };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "反映に失敗しました";
        return { success: false, error: `反映に失敗しました: ${msg}` };
      }
    },
    [requests, mutateSch]
  );

  const publish = useCallback(
    async (organizationId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const sb = getSupabase();
        const userId = (await sb.auth.getUser()).data.user?.id;
        await shiftRepository.publishDrafts(getSupabase(), {
          organizationId,
          publishedBy: userId,
          ym,
          totalDays,
        });
        mutateSch();
        return { success: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "公開に失敗しました";
        return { success: false, error: `公開に失敗しました: ${msg}` };
      }
    },
    [ym, totalDays, mutateSch]
  );

  return {
    requests,
    requestsError,
    mutateReqs,
    schedules,
    mutateSch,
    employees,
    totalDays,
    ym,
    autoFill,
    publish,
  };
}
