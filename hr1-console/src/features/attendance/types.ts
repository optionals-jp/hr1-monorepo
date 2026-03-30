import type { AttendanceRecord, AttendanceApprover, AttendanceCorrection } from "@/types/database";

export type TabValue = "daily" | "monthly" | "approvers" | "corrections" | "settings";

export type DailyRecord = AttendanceRecord & {
  profiles: { display_name: string | null; email: string; position: string | null };
};

export type ApproverRow = AttendanceApprover & {
  target_profile?: { display_name: string | null; email: string } | null;
  approver_profile?: { display_name: string | null; email: string } | null;
  departments?: { id: string; name: string } | null;
  projects?: { id: string; name: string } | null;
};

export type CorrectionRow = AttendanceCorrection & {
  requester?: { display_name: string | null; email: string } | null;
  reviewer_profile?: { display_name: string | null; email: string } | null;
  attendance_records?: { date: string } | null;
};

export interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

export interface MonthlySummaryRow {
  user_id: string;
  display_name: string | null;
  email: string;
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  total_work_minutes: number;
  total_overtime_minutes: number;
}
