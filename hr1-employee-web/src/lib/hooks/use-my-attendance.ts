"use client";

import { useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as attendanceRepo from "@/lib/repositories/attendance-repository";
import type { AttendanceCorrection, AttendancePunch, AttendanceRecord } from "@/types/database";
import { format, startOfMonth, endOfMonth } from "date-fns";

export function useMyAttendance() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const punchKey = user && organization ? `my-punches-${organization.id}-${user.id}-today` : null;
  const recordsKey =
    user && organization ? `my-attendance-${organization.id}-${user.id}-${startDate}` : null;
  const correctionsKey =
    user && organization ? `my-corrections-${organization.id}-${user.id}` : null;

  const { data: todayPunches = [], mutate: mutatePunches } = useQuery<AttendancePunch[]>(
    punchKey,
    () => attendanceRepo.fetchTodayPunches(getSupabase(), organization!.id, user!.id)
  );

  const {
    data: records = [],
    isLoading,
    error,
    mutate: mutateRecords,
  } = useQuery<AttendanceRecord[]>(recordsKey, () =>
    attendanceRepo.fetchMyRecords(getSupabase(), organization!.id, user!.id, startDate, endDate)
  );

  const { data: corrections = [], mutate: mutateCorrections } = useQuery<AttendanceCorrection[]>(
    correctionsKey,
    () => attendanceRepo.fetchMyCorrections(getSupabase(), organization!.id, user!.id)
  );

  const lastPunch = todayPunches.length > 0 ? todayPunches[todayPunches.length - 1] : null;
  const isClockedIn = lastPunch?.punch_type === "clock_in" || lastPunch?.punch_type === "break_end";
  const isOnBreak = lastPunch?.punch_type === "break_start";

  const doPunch = async (punchType: AttendancePunch["punch_type"]) => {
    await attendanceRepo.punch(getSupabase(), {
      organization_id: organization!.id,
      user_id: user!.id,
      punch_type: punchType,
    });
    mutatePunches();
    mutateRecords();
  };

  const requestCorrection = async (data: {
    record_id: string;
    original_clock_in: string | null;
    original_clock_out: string | null;
    requested_clock_in: string | null;
    requested_clock_out: string | null;
    reason: string;
  }) => {
    await attendanceRepo.requestCorrection(getSupabase(), {
      organization_id: organization!.id,
      user_id: user!.id,
      ...data,
    });
    mutateCorrections();
  };

  return {
    currentMonth,
    setCurrentMonth,
    todayPunches,
    records,
    isLoading,
    error,
    mutateRecords,
    lastPunch,
    isClockedIn,
    isOnBreak,
    doPunch,
    corrections,
    requestCorrection,
  };
}
