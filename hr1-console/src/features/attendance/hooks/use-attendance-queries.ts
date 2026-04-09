"use client";

import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import * as attendanceRepo from "@/lib/repositories/attendance-repository";
import type { AttendancePunch } from "@/types/database";
import type {
  MonthlySummaryRow,
  DailyRecord,
  CorrectionRow,
  ApproverRow,
} from "@/features/attendance/types";

export function useMonthlySummary(monthYear: number, monthMonth: number) {
  const { organization } = useOrg();
  return useQuery<MonthlySummaryRow[]>(
    organization ? `attendance-monthly-${organization.id}-${monthYear}-${monthMonth}` : null,
    async () => {
      const startDate = `${monthYear}-${String(monthMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(monthYear, monthMonth, 0).getDate();
      const endDate = `${monthYear}-${String(monthMonth).padStart(2, "0")}-${lastDay}`;
      return attendanceRepo.getMonthlySummary(
        getSupabase(),
        organization!.id,
        startDate,
        endDate
      ) as Promise<MonthlySummaryRow[]>;
    }
  );
}

export function useDailyRecords(selectedDate: string) {
  const { organization } = useOrg();
  return useQuery<DailyRecord[]>(
    organization ? `attendance-daily-${organization.id}-${selectedDate}` : null,
    async () => {
      return attendanceRepo.findDailyRecords(
        getSupabase(),
        organization!.id,
        selectedDate
      ) as Promise<DailyRecord[]>;
    }
  );
}

export function useDailyPunches(selectedDate: string) {
  const { organization } = useOrg();
  return useQuery<AttendancePunch[]>(
    organization ? `attendance-punches-${organization.id}-${selectedDate}` : null,
    async () => {
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const dayEnd = new Date(`${selectedDate}T00:00:00`);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return attendanceRepo.findDailyPunches(
        getSupabase(),
        organization!.id,
        dayStart.toISOString(),
        dayEnd.toISOString()
      );
    }
  );
}

export function useCorrections() {
  const { organization } = useOrg();
  return useQuery<CorrectionRow[]>(
    organization ? `attendance-corrections-${organization.id}` : null,
    async () => {
      return attendanceRepo.findCorrections(getSupabase(), organization!.id) as Promise<
        CorrectionRow[]
      >;
    }
  );
}

export async function reviewCorrection(
  correctionId: string,
  organizationId: string,
  status: string,
  reviewComment: string | null,
  recordId: string,
  requestedClockIn: string | null,
  requestedClockOut: string | null,
  userId: string
) {
  const client = getSupabase();

  await attendanceRepo.reviewCorrection(
    client,
    correctionId,
    organizationId,
    status,
    userId,
    reviewComment
  );

  if (status === "approved") {
    const updates: Record<string, unknown> = {};
    if (requestedClockIn) updates.clock_in = requestedClockIn;
    if (requestedClockOut) updates.clock_out = requestedClockOut;
    if (Object.keys(updates).length > 0) {
      await attendanceRepo.updateRecordTimes(client, recordId, organizationId, updates);
    }
  }
}

export async function upsertAttendanceSettings(data: {
  organization_id: string;
  work_start_time: string;
  work_end_time: string;
  break_minutes: number;
}) {
  return attendanceRepo.upsertSettings(getSupabase(), data);
}

export function useApprovers() {
  const { organization } = useOrg();
  return useQuery<ApproverRow[]>(
    organization ? `attendance-approvers-${organization.id}` : null,
    async () => {
      return attendanceRepo.findApprovers(getSupabase(), organization!.id) as Promise<
        ApproverRow[]
      >;
    }
  );
}

export async function addApprover(data: {
  organization_id: string;
  user_id: string | null;
  department_id: string | null;
  project_id: string | null;
  approver_id: string;
}) {
  return attendanceRepo.addApprover(getSupabase(), data);
}

export async function deleteApprover(id: string, organizationId: string) {
  return attendanceRepo.deleteApprover(getSupabase(), id, organizationId);
}
