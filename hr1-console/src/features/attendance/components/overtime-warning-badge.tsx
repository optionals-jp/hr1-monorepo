"use client";

import { Badge } from "@/components/ui/badge";
import {
  getOvertimeWarningLevel,
  getOvertimeWarningColor,
  type OvertimeLevel,
} from "@/features/attendance/utils/overtime-warnings";

const LABEL: Record<Exclude<OvertimeLevel, "normal">, string> = {
  warning: "残業注意",
  critical: "残業危険",
};

export function OvertimeWarningBadge({ overtimeMinutes }: { overtimeMinutes: number }) {
  const level = getOvertimeWarningLevel(overtimeMinutes);
  if (level === "normal") return null;

  return (
    <Badge variant="outline" className={getOvertimeWarningColor(level)}>
      {LABEL[level]}
    </Badge>
  );
}
