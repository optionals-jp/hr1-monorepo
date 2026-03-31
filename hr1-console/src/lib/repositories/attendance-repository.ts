import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceRecord,
  AttendancePunch,
  AttendanceSettingsRow,
  Profile,
} from "@/types/database";

export async function findProfile(client: SupabaseClient, userId: string, organizationId: string) {
  const { data: membership } = await client
    .from("user_organizations")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!membership) return null;
  const { data } = await client.from("profiles").select("*").eq("id", userId).single();
  return data as Profile;
}

export async function findRecords(
  client: SupabaseClient,
  params: {
    userId: string;
    organizationId: string;
    startDate: string;
    endDate: string;
  }
) {
  const { data } = await client
    .from("attendance_records")
    .select("*")
    .eq("user_id", params.userId)
    .eq("organization_id", params.organizationId)
    .gte("date", params.startDate)
    .lte("date", params.endDate)
    .order("date", { ascending: true });
  return (data ?? []) as AttendanceRecord[];
}

export async function findPunches(
  client: SupabaseClient,
  params: {
    userId: string;
    organizationId: string;
    monthStart: string;
    monthEnd: string;
  }
) {
  const { data } = await client
    .from("attendance_punches")
    .select("*")
    .eq("user_id", params.userId)
    .eq("organization_id", params.organizationId)
    .gte("punched_at", params.monthStart)
    .lt("punched_at", params.monthEnd)
    .order("punched_at", { ascending: true });
  return (data ?? []) as AttendancePunch[];
}

export async function findSettings(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("attendance_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data as AttendanceSettingsRow | null;
}

// --- Attendance data (employees, departments, projects) ---

export async function findEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name)")
    .eq("organization_id", organizationId);
  return (data ?? []).map((d) => {
    const p = d.profiles as unknown as { id: string; email: string; display_name: string | null };
    return { id: p.id, email: p.email, display_name: p.display_name };
  });
}

export async function findDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return data ?? [];
}

export async function findActiveProjects(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active"])
    .order("name");
  return data ?? [];
}

// --- Monthly summary (RPC) ---

export async function getMonthlySummary(
  client: SupabaseClient,
  organizationId: string,
  startDate: string,
  endDate: string
) {
  const { data } = await client.rpc("get_monthly_attendance_summary", {
    p_organization_id: organizationId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  return data ?? [];
}

// --- Daily records ---

export async function findDailyRecords(
  client: SupabaseClient,
  organizationId: string,
  date: string
) {
  const { data } = await client
    .from("attendance_records")
    .select("*, profiles!attendance_records_user_id_fkey(display_name, email, position)")
    .eq("organization_id", organizationId)
    .eq("date", date)
    .order("clock_in", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function findDailyPunches(
  client: SupabaseClient,
  organizationId: string,
  dayStart: string,
  dayEnd: string
) {
  const { data } = await client
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("punched_at", dayStart)
    .lt("punched_at", dayEnd)
    .order("punched_at", { ascending: true });
  return (data ?? []) as AttendancePunch[];
}

// --- Corrections ---

export async function findCorrections(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("attendance_corrections")
    .select(
      "*, requester:profiles!attendance_corrections_user_id_fkey(display_name, email), reviewer_profile:profiles!attendance_corrections_reviewed_by_fkey(display_name, email), attendance_records(date)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function reviewCorrection(
  client: SupabaseClient,
  correctionId: string,
  organizationId: string,
  status: string,
  reviewedBy: string,
  reviewComment: string | null
) {
  return client
    .from("attendance_corrections")
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_comment: reviewComment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", correctionId)
    .eq("organization_id", organizationId);
}

export async function updateRecordTimes(
  client: SupabaseClient,
  recordId: string,
  organizationId: string,
  updates: Record<string, unknown>
) {
  return client
    .from("attendance_records")
    .update(updates)
    .eq("id", recordId)
    .eq("organization_id", organizationId);
}

// --- Settings (upsert) ---

export async function upsertSettings(
  client: SupabaseClient,
  data: {
    organization_id: string;
    work_start_time: string;
    work_end_time: string;
    break_minutes: number;
  }
) {
  return client.from("attendance_settings").upsert(data, { onConflict: "organization_id" });
}

// --- Approvers ---

export async function findApprovers(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("attendance_approvers")
    .select(
      "*, target_profile:profiles!attendance_approvers_user_id_fkey(display_name, email), approver_profile:profiles!attendance_approvers_approver_id_fkey(display_name, email), departments(id, name), projects(id, name)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addApprover(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string | null;
    department_id: string | null;
    project_id: string | null;
    approver_id: string;
  }
) {
  return client.from("attendance_approvers").insert(data);
}

export async function deleteApprover(client: SupabaseClient, id: string, organizationId: string) {
  return client
    .from("attendance_approvers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
}
