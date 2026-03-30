"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as attendanceRepository from "@/lib/repositories/attendance-repository";
import type {
  AttendanceRecord,
  AttendancePunch,
  AttendanceSettingsRow,
  Profile,
} from "@/types/database";

export function useAttendanceDetail(userId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data: profile } = useOrgQuery<Profile | null>(
    `attendance-detail-profile-${userId}`,
    (orgId) => attendanceRepository.findProfile(getSupabase(), userId, orgId)
  );

  const {
    data: records = [],
    isLoading: recordsLoading,
    error: recordsError,
    mutate: mutateRecords,
  } = useOrgQuery<AttendanceRecord[]>(
    `attendance-detail-records-${userId}-${year}-${month}`,
    (orgId) =>
      attendanceRepository.findRecords(getSupabase(), {
        userId,
        organizationId: orgId,
        startDate,
        endDate,
      })
  );

  const { data: punches = [] } = useOrgQuery<AttendancePunch[]>(
    `attendance-detail-punches-${userId}-${year}-${month}`,
    (orgId) => {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);
      return attendanceRepository.findPunches(getSupabase(), {
        userId,
        organizationId: orgId,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
      });
    }
  );

  const { data: settings } = useOrgQuery<AttendanceSettingsRow | null>(
    "attendance-settings",
    (orgId) => attendanceRepository.findSettings(getSupabase(), orgId)
  );

  return {
    profile,
    records,
    recordsLoading,
    recordsError,
    mutateRecords,
    punches,
    settings,
    lastDay,
  };
}
