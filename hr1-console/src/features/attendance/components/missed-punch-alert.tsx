"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { MissedPunchEmployee } from "@/features/attendance/utils/missed-punch-detection";

const TYPE_LABEL: Record<MissedPunchEmployee["type"], string> = {
  no_clock_in: "出勤未打刻",
  no_clock_out: "退勤未打刻",
};

export function MissedPunchAlert({ employees }: { employees: MissedPunchEmployee[] }) {
  const [expanded, setExpanded] = useState(false);

  if (employees.length === 0) return null;

  const noClockIn = employees.filter((e) => e.type === "no_clock_in");
  const noClockOut = employees.filter((e) => e.type === "no_clock_out");

  const parts: string[] = [];
  if (noClockIn.length > 0) parts.push(`${noClockIn.length}名が出勤打刻をしていません`);
  if (noClockOut.length > 0) parts.push(`${noClockOut.length}名が退勤打刻をしていません`);

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
        <span className="flex-1 text-sm font-medium text-yellow-800">{parts.join("、")}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-yellow-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-yellow-600" />
        )}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-1 pl-6 text-sm text-yellow-700">
          {employees.map((emp) => (
            <li key={`${emp.userId}-${emp.type}`}>
              {emp.displayName}（{TYPE_LABEL[emp.type]}・予定: {emp.expectedTime}）
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
