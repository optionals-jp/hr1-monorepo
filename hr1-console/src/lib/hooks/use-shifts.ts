"use client";

import { useState, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as shiftRepository from "@/lib/repositories/shift-repository";
import type { ShiftRequest, ShiftSchedule } from "@/types/database";
import { formatYearMonth } from "@/lib/utils";

type TabValue = "requests" | "schedule";

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

export type { TabValue, RequestWithProfile, ScheduleWithProfile, Employee };

export function useShifts() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const orgId = organization?.id ?? null;

  const now = new Date();
  const [tab, setTab] = useState<TabValue>("requests");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [publishing, setPublishing] = useState(false);

  const ym = formatYearMonth(year, month);
  const totalDays = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  const {
    data: requests,
    error: requestsError,
    mutate: mutateReqs,
  } = useOrgQuery<RequestWithProfile[]>(`shift-requests-${ym}`, (oid) =>
    shiftRepository.findRequests(getSupabase(), oid, ym, totalDays)
  );

  const { data: schedules, mutate: mutateSch } = useOrgQuery<ScheduleWithProfile[]>(
    `shift-schedules-${ym}`,
    (oid) => shiftRepository.findSchedules(getSupabase(), oid, ym, totalDays)
  );

  const { data: employees } = useOrgQuery<Employee[]>("shift-employees", (oid) =>
    shiftRepository.findEmployees(getSupabase(), oid)
  );

  const requestMap = useMemo(() => {
    const map = new Map<string, Map<string, RequestWithProfile>>();
    for (const r of requests ?? []) {
      if (!map.has(r.user_id)) map.set(r.user_id, new Map());
      map.get(r.user_id)!.set(r.target_date, r);
    }
    return map;
  }, [requests]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleWithProfile>>();
    for (const s of schedules ?? []) {
      if (!map.has(s.user_id)) map.set(s.user_id, new Map());
      map.get(s.user_id)!.set(s.target_date, s);
    }
    return map;
  }, [schedules]);

  const autoFill = async (
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
  };

  const publish = async (organizationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await shiftRepository.publishDrafts(getSupabase(), {
        organizationId,
        publishedBy: user?.id,
        ym,
        totalDays,
      });
      mutateSch();
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "公開に失敗しました";
      return { success: false, error: `公開に失敗しました: ${msg}` };
    }
  };

  const handleAutoFill = async (): Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }> => {
    if (!orgId) return { success: false, error: "組織が選択されていません" };
    return autoFill(orgId);
  };

  const handlePublish = async (): Promise<{ success: boolean; error?: string }> => {
    if (!orgId) return { success: false, error: "組織が選択されていません" };
    setPublishing(true);
    const result = await publish(orgId);
    setPublishing(false);
    return result;
  };

  const draftCount = (schedules ?? []).filter((s) => s.status === "draft").length;

  return {
    tab,
    setTab,
    year,
    month,
    prevMonth,
    nextMonth,
    publishing,
    requests,
    requestsError,
    mutateReqs,
    schedules,
    employees,
    totalDays,
    requestMap,
    scheduleMap,
    handleAutoFill,
    handlePublish,
    draftCount,
  };
}
