"use client";

import type { AttendancePunch, AttendanceSettingsRow } from "@/types/database";

function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function TimelineBar({
  clockIn,
  clockOut,
  punches,
  settings,
}: {
  clockIn: string | null;
  clockOut: string | null;
  punches: AttendancePunch[];
  settings: AttendanceSettingsRow | null;
}) {
  const RANGE_START = 6 * 60;
  const RANGE_END = 22 * 60;
  const RANGE = RANGE_END - RANGE_START;

  const toPercent = (min: number) =>
    Math.max(0, Math.min(100, ((min - RANGE_START) / RANGE) * 100));

  if (!clockIn)
    return (
      <div className="h-6 bg-muted/30 rounded text-xs text-muted-foreground flex items-center justify-center">
        未出勤
      </div>
    );

  const inMin = timeToMinutes(clockIn);
  const outMin = clockOut ? timeToMinutes(clockOut) : null;

  const breakPeriods: { start: number; end: number }[] = [];
  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );
  let breakStart: number | null = null;
  for (const p of sortedPunches) {
    if (p.punch_type === "break_start") {
      breakStart = timeToMinutes(p.punched_at);
    } else if (p.punch_type === "break_end" && breakStart !== null) {
      breakPeriods.push({ start: breakStart, end: timeToMinutes(p.punched_at) });
      breakStart = null;
    }
  }

  const workStart = settings?.work_start_time
    ? parseInt(settings.work_start_time.split(":")[0]) * 60 +
      parseInt(settings.work_start_time.split(":")[1])
    : null;
  const workEnd = settings?.work_end_time
    ? parseInt(settings.work_end_time.split(":")[0]) * 60 +
      parseInt(settings.work_end_time.split(":")[1])
    : null;

  return (
    <div className="relative h-6 bg-muted/30 rounded overflow-hidden">
      {workStart !== null && workEnd !== null && (
        <div
          className="absolute top-0 bottom-0 bg-blue-50"
          style={{
            left: `${toPercent(workStart)}%`,
            width: `${toPercent(workEnd) - toPercent(workStart)}%`,
          }}
        />
      )}
      {outMin !== null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400 rounded-sm"
          style={{
            left: `${toPercent(inMin)}%`,
            width: `${Math.max(0.5, toPercent(outMin) - toPercent(inMin))}%`,
          }}
        />
      )}
      {outMin === null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400/60 rounded-sm animate-pulse"
          style={{ left: `${toPercent(inMin)}%`, right: "0%" }}
        />
      )}
      {breakPeriods.map((bp, i) => (
        <div
          key={i}
          className="absolute top-1 bottom-1 bg-amber-300 rounded-sm"
          style={{
            left: `${toPercent(bp.start)}%`,
            width: `${Math.max(0.3, toPercent(bp.end) - toPercent(bp.start))}%`,
          }}
        />
      ))}
      {outMin !== null && workEnd !== null && outMin > workEnd && (
        <div
          className="absolute top-1 bottom-1 bg-red-400/70 rounded-sm"
          style={{
            left: `${toPercent(workEnd)}%`,
            width: `${toPercent(outMin) - toPercent(workEnd)}%`,
          }}
        />
      )}
      {[6, 9, 12, 15, 18, 21].map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-muted-foreground/10"
          style={{ left: `${toPercent(h * 60)}%` }}
        >
          <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground/40 leading-none">
            {h}
          </span>
        </div>
      ))}
    </div>
  );
}
