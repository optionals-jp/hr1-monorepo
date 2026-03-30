import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShiftRequest, ShiftSchedule } from "@/types/database";

type RequestWithProfile = ShiftRequest & {
  profiles: { display_name: string | null; email: string };
};

type ScheduleWithProfile = ShiftSchedule & {
  profiles: { display_name: string | null; email: string };
};

export async function findRequests(
  client: SupabaseClient,
  organizationId: string,
  ym: string,
  totalDays: number
) {
  const { data } = await client
    .from("shift_requests")
    .select("*, profiles!shift_requests_user_id_fkey(display_name, email)")
    .eq("organization_id", organizationId)
    .gte("target_date", `${ym}-01`)
    .lte("target_date", `${ym}-${totalDays}`)
    .order("target_date");
  return (data ?? []) as RequestWithProfile[];
}

export async function findSchedules(
  client: SupabaseClient,
  organizationId: string,
  ym: string,
  totalDays: number
) {
  const { data } = await client
    .from("shift_schedules")
    .select("*, profiles!shift_schedules_user_id_fkey(display_name, email)")
    .eq("organization_id", organizationId)
    .gte("target_date", `${ym}-01`)
    .lte("target_date", `${ym}-${totalDays}`)
    .order("target_date");
  return (data ?? []) as ScheduleWithProfile[];
}

export async function findEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!user_organizations_user_id_fkey(id, display_name, email)")
    .eq("organization_id", organizationId)
    .in("role", ["employee", "admin", "owner"]);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const p = row.profiles as Record<string, unknown> | null;
    return {
      id: row.user_id as string,
      email: (p?.email as string) ?? "",
      display_name: (p?.display_name as string | null) ?? null,
    };
  });
}

export async function autoFillFromRequests(
  client: SupabaseClient,
  organizationId: string,
  requests: RequestWithProfile[]
) {
  const upserts = requests
    .filter((r) => r.is_available && r.start_time && r.end_time)
    .map((r) => ({
      user_id: r.user_id,
      organization_id: organizationId,
      target_date: r.target_date,
      start_time: r.start_time!,
      end_time: r.end_time!,
      status: "draft",
    }));

  if (upserts.length === 0) return { count: 0 };

  const { error } = await client
    .from("shift_schedules")
    .upsert(upserts, { onConflict: "user_id,organization_id,target_date" });

  if (error) throw error;
  return { count: upserts.length };
}

export async function publishDrafts(
  client: SupabaseClient,
  params: {
    organizationId: string;
    publishedBy: string | undefined;
    ym: string;
    totalDays: number;
  }
) {
  const { error } = await client
    .from("shift_schedules")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_by: params.publishedBy,
    })
    .eq("organization_id", params.organizationId)
    .eq("status", "draft")
    .gte("target_date", `${params.ym}-01`)
    .lte("target_date", `${params.ym}-${params.totalDays}`);

  if (error) throw error;
}
