import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttendancePunch, AttendanceCorrection, AttendanceRecord } from "@/types/database";

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
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await client
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("punched_at", `${today}T00:00:00`)
    .lte("punched_at", `${today}T23:59:59`)
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
  const { data, error } = await client
    .from("attendance_records")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AttendanceRecord[];
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
