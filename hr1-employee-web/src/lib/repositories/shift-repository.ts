import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShiftRequest, ShiftSchedule } from "@/types/database";

export async function fetchMyRequests(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await client
    .from("shift_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("target_date", startDate)
    .lte("target_date", endDate)
    .order("target_date");
  if (error) throw error;
  return (data ?? []) as ShiftRequest[];
}

export async function submitRequest(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    target_date: string;
    is_available: boolean;
    start_time: string | null;
    end_time: string | null;
    note: string | null;
  }
) {
  const { error } = await client
    .from("shift_requests")
    .upsert(
      { ...data, submitted_at: new Date().toISOString() },
      { onConflict: "organization_id,user_id,target_date" }
    );
  if (error) throw error;
}

export async function fetchMySchedules(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await client
    .from("shift_schedules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "published")
    .gte("target_date", startDate)
    .lte("target_date", endDate)
    .order("target_date");
  if (error) throw error;
  return (data ?? []) as ShiftSchedule[];
}
