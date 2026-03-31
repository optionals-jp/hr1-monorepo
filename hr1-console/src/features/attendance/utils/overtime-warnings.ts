export type OvertimeLevel = "normal" | "warning" | "critical";

const WARNING_THRESHOLD_MINUTES = 45 * 60;
const CRITICAL_THRESHOLD_MINUTES = 80 * 60;

export function getOvertimeWarningLevel(overtimeMinutes: number): OvertimeLevel {
  if (overtimeMinutes >= CRITICAL_THRESHOLD_MINUTES) return "critical";
  if (overtimeMinutes >= WARNING_THRESHOLD_MINUTES) return "warning";
  return "normal";
}

export function getOvertimeWarningColor(level: OvertimeLevel): string {
  switch (level) {
    case "critical":
      return "text-red-700 bg-red-100 border-red-200";
    case "warning":
      return "text-yellow-700 bg-yellow-100 border-yellow-200";
    default:
      return "";
  }
}
