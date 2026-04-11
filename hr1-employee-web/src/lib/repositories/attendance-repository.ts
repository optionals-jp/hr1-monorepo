import type { SupabaseClient } from "@supabase/supabase-js";
import { jstDateRangeIso } from "@hr1/shared-ui/lib/date-range";
import type { AttendancePunch, AttendanceCorrection, AttendanceRecord } from "@/types/database";

const JST_OFFSET_MIN = 9 * 60;

function toJstDateString(utcIso: string): string {
  const d = new Date(utcIso);
  d.setMinutes(d.getMinutes() + JST_OFFSET_MIN);
  return d.toISOString().split("T")[0];
}

function todayJst(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + JST_OFFSET_MIN);
  return now.toISOString().split("T")[0];
}

function jstDayRangeUtc(dateStr: string): { start: string; end: string } {
  const { startIso, endIso } = jstDateRangeIso(dateStr, dateStr);
  return { start: startIso!, end: endIso! };
}

function jstMonthRangeUtc(startDate: string, endDate: string): { start: string; end: string } {
  const { startIso, endIso } = jstDateRangeIso(startDate, endDate);
  return { start: startIso!, end: endIso! };
}

export async function punch(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    punch_type: AttendancePunch["punch_type"];
  }
) {
  const { error } = await client.from("attendance_punches").insert({
    ...data,
    punched_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchTodayPunches(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const today = todayJst();
  const { start, end } = jstDayRangeUtc(today);
  const { data, error } = await client
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("punched_at", start)
    .lte("punched_at", end)
    .order("punched_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttendancePunch[];
}

export async function fetchMyRecords(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data: records, error: recError } = await client
    .from("attendance_records")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (recError) throw recError;

  if (records && records.length > 0) {
    return records as AttendanceRecord[];
  }

  const utcRange = jstMonthRangeUtc(startDate, endDate);
  const { data: punches, error: punchError } = await client
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("punched_at", utcRange.start)
    .lte("punched_at", utcRange.end)
    .order("punched_at", { ascending: true });
  if (punchError) throw punchError;
  if (!punches || punches.length === 0) return [];

  const byDate = new Map<string, typeof punches>();
  for (const p of punches) {
    const date = toJstDateString(p.punched_at);
    const list = byDate.get(date) ?? [];
    list.push(p);
    byDate.set(date, list);
  }

  const result: AttendanceRecord[] = [];
  for (const [date, dayPunches] of byDate) {
    const clockIn = dayPunches.find((p) => p.punch_type === "clock_in");
    const clockOut = [...dayPunches].reverse().find((p) => p.punch_type === "clock_out");

    let breakMinutes = 0;
    let breakStart: string | null = null;
    for (const p of dayPunches) {
      if (p.punch_type === "break_start") {
        breakStart = p.punched_at;
      } else if (p.punch_type === "break_end" && breakStart) {
        breakMinutes += Math.round(
          (new Date(p.punched_at).getTime() - new Date(breakStart).getTime()) / 60000
        );
        breakStart = null;
      }
    }

    const clockInTime = clockIn ? new Date(clockIn.punched_at).getTime() : null;
    const clockOutTime = clockOut ? new Date(clockOut.punched_at).getTime() : null;
    const workMinutes =
      clockInTime && clockOutTime
        ? Math.round((clockOutTime - clockInTime) / 60000) - breakMinutes
        : 0;

    result.push({
      id: `punch-${date}`,
      organization_id: organizationId,
      user_id: userId,
      date,
      clock_in: clockIn?.punched_at ?? null,
      clock_out: clockOut?.punched_at ?? null,
      break_minutes: breakMinutes,
      work_minutes: Math.max(0, workMinutes),
      overtime_minutes: 0,
      status: clockIn ? "present" : "absent",
      note: null,
      created_at: dayPunches[0].created_at,
      updated_at: dayPunches[0].created_at,
    });
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export async function requestCorrection(
  client: SupabaseClient,
  data: {
    organization_id: string;
    record_id: string;
    user_id: string;
    original_clock_in: string | null;
    original_clock_out: string | null;
    requested_clock_in: string | null;
    requested_clock_out: string | null;
    reason: string;
  }
) {
  const { error } = await client.from("attendance_corrections").insert(data);
  if (error) throw error;
}

export async function fetchMyCorrections(
  client: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await client
    .from("attendance_corrections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as AttendanceCorrection[];
}
