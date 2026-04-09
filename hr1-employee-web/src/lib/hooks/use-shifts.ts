"use client";

import { useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as shiftRepo from "@/lib/repositories/shift-repository";
import type { ShiftRequest, ShiftSchedule } from "@/types/database";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function useMyShifts() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const requestsKey =
    user && organization ? `my-shift-requests-${organization.id}-${user.id}-${startDate}` : null;
  const schedulesKey =
    user && organization ? `my-shift-schedules-${organization.id}-${user.id}-${startDate}` : null;

  const { data: requests = [], mutate: mutateRequests } = useQuery<ShiftRequest[]>(
    requestsKey,
    () => shiftRepo.fetchMyRequests(getSupabase(), organization!.id, user!.id, startDate, endDate)
  );

  const {
    data: schedules = [],
    isLoading,
    error,
    mutate: mutateSchedules,
  } = useQuery<ShiftSchedule[]>(schedulesKey, () =>
    shiftRepo.fetchMySchedules(getSupabase(), organization!.id, user!.id, startDate, endDate)
  );

  const submitRequest = async (
    targetDate: string,
    isAvailable: boolean,
    startTime: string | null,
    endTime: string | null,
    note: string | null
  ) => {
    await shiftRepo.submitRequest(getSupabase(), {
      organization_id: organization!.id,
      user_id: user!.id,
      target_date: targetDate,
      is_available: isAvailable,
      start_time: startTime,
      end_time: endTime,
      note,
    });
    mutateRequests();
  };

  return {
    currentMonth,
    setCurrentMonth,
    requests,
    schedules,
    isLoading,
    error,
    mutateSchedules,
    submitRequest,
  };
}
