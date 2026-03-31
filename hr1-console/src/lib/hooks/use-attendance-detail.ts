"use client";

import { useState, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as attendanceRepository from "@/lib/repositories/attendance-repository";
import { formatDateLocal } from "@/lib/utils";
import type {
  AttendanceRecord,
  AttendancePunch,
  AttendanceSettingsRow,
  Profile,
} from "@/types/database";

function calcWorkMinutes(r: AttendanceRecord): number {
  if (!r.clock_in || !r.clock_out) return 0;
  const diff = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
  return Math.round(diff / 60000) - r.break_minutes;
}

export function useAttendanceDetail(userId: string) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);

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

  const punchesByDate = useMemo(() => {
    const map = new Map<string, AttendancePunch[]>();
    for (const p of punches) {
      const date = formatDateLocal(new Date(p.punched_at));
      const arr = map.get(date) ?? [];
      arr.push(p);
      map.set(date, arr);
    }
    return map;
  }, [punches]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records) {
      map.set(r.date, r);
    }
    return map;
  }, [records]);

  const calendarDays = useMemo(() => {
    const days: { date: string; dayOfWeek: number; isToday: boolean }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = formatDateLocal(dateObj);
      days.push({
        date: dateStr,
        dayOfWeek: dateObj.getDay(),
        isToday: dateStr === formatDateLocal(new Date()),
      });
    }
    return days;
  }, [year, month, lastDay]);

  const monthlySummary = useMemo(() => {
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalLateNightMinutes = 0;

    for (const r of records) {
      if (r.status === "present" || r.status === "late" || r.status === "early_leave") {
        presentDays++;
      }
      if (r.status === "late") lateDays++;
      if (r.status === "absent") absentDays++;
      totalWorkMinutes += calcWorkMinutes(r);
      totalBreakMinutes += r.break_minutes;
      totalOvertimeMinutes += r.overtime_minutes;
      totalLateNightMinutes += r.late_night_minutes;
    }

    return {
      presentDays,
      lateDays,
      absentDays,
      totalWorkMinutes,
      totalBreakMinutes,
      totalOvertimeMinutes,
      totalLateNightMinutes,
    };
  }, [records]);

  const shiftMonth = (dir: number) => {
    let y = year;
    let m = month + dir;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  return {
    year,
    month,
    expandedDate,
    setExpandedDate,
    showAuditLog,
    setShowAuditLog,
    profile,
    records,
    recordsLoading,
    recordsError,
    mutateRecords,
    punches,
    settings,
    lastDay,
    punchesByDate,
    recordsByDate,
    calendarDays,
    monthlySummary,
    shiftMonth,
    goToCurrentMonth,
  };
}
