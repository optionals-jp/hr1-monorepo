import { BadgeVariant } from "./types";

export const attendanceStatusLabels: Record<string, string> = {
  present: "出勤",
  absent: "欠勤",
  late: "遅刻",
  early_leave: "早退",
  paid_leave: "有休",
  half_day_am: "午前半休",
  half_day_pm: "午後半休",
  holiday: "休日",
  sick_leave: "病欠",
  special_leave: "特別休暇",
};

export const attendanceStatusColors: Record<string, BadgeVariant> = {
  present: "default",
  absent: "destructive",
  late: "outline",
  early_leave: "outline",
  paid_leave: "secondary",
  half_day_am: "secondary",
  half_day_pm: "secondary",
  holiday: "secondary",
  sick_leave: "destructive",
  special_leave: "secondary",
};

export const punchTypeLabels: Record<string, string> = {
  clock_in: "出勤",
  clock_out: "退勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
};

export const correctionStatusLabels: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
};

export const correctionStatusColors: Record<string, BadgeVariant> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};
