import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationStatus } from "@/lib/constants";
import { format } from "date-fns";

export async function fetchDashboardStats(client: SupabaseClient, orgId: string) {
  const [applicantsRes, employeesRes, jobsRes, appsRes] = await Promise.all([
    client
      .from("user_organizations")
      .select("user_id, profiles!inner(role)", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("profiles.role", "applicant"),
    client
      .from("user_organizations")
      .select("user_id, profiles!inner(role)", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("profiles.role", "employee"),
    client
      .from("jobs")
      .select("id", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("status", "open"),
    client
      .from("applications")
      .select("id", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("status", ApplicationStatus.Active),
  ]);

  return {
    applicants: applicantsRes.count ?? 0,
    employees: employeesRes.count ?? 0,
    openJobs: jobsRes.count ?? 0,
    activeApplications: appsRes.count ?? 0,
  };
}

export async function fetchPipelineData(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("applications")
    .select("id, status, application_steps(step_type, step_order, status, label)")
    .eq("organization_id", orgId);
  return data;
}

export async function fetchApplicationsByDateRange(
  client: SupabaseClient,
  orgId: string,
  startDate: string
) {
  const { data } = await client
    .from("applications")
    .select("id, status, applied_at")
    .eq("organization_id", orgId)
    .gte("applied_at", startDate);
  return data;
}

export async function fetchApplicationsBySource(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("applications")
    .select("id, status, source")
    .eq("organization_id", orgId);
  return data;
}

export async function fetchTimeToHireData(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("offers")
    .select("id, created_at, application_id, applications!inner(applied_at, jobs(department))")
    .eq("organization_id", orgId);
  return data;
}

export async function fetchFunnelData(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("applications")
    .select("id, status, application_steps(step_type, step_order, status, label)")
    .eq("organization_id", orgId);
  return data;
}

export async function fetchApplicationsWithDepartment(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("applications")
    .select("id, status, jobs(department)")
    .eq("organization_id", orgId);
  return data;
}

export async function fetchOpenJobsWithApplicants(client: SupabaseClient, orgId: string) {
  const { data: jobs } = await client
    .from("jobs")
    .select("id, title, department")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (!jobs || jobs.length === 0) return { jobs: [], apps: [] };

  const { data: apps } = await client
    .from("applications")
    .select("job_id, status")
    .eq("organization_id", orgId)
    .in(
      "job_id",
      jobs.map((j) => j.id)
    );

  return { jobs, apps: apps ?? [] };
}

export async function fetchEmployeeDepartments(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("employee_departments")
    .select("user_id, departments!inner(name, organization_id)")
    .eq("departments.organization_id", orgId);
  return data;
}

export async function countPendingWorkflows(client: SupabaseClient, orgId: string) {
  const { count } = await client
    .from("workflow_requests")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "pending");
  return count ?? 0;
}

export async function fetchLeaveUsageRate(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("leave_balances")
    .select("granted_days, used_days, carried_over_days")
    .eq("organization_id", orgId)
    .eq("fiscal_year", new Date().getFullYear());
  return data;
}

export async function countAttendanceAnomalies(client: SupabaseClient, orgId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { count } = await client
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .is("clock_out", null)
    .lt("date", today);
  return count ?? 0;
}

export async function fetchHiringTypeData(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!inner(role, hiring_type)")
    .eq("organization_id", orgId)
    .eq("profiles.role", "employee");
  return data;
}

/* ------------------------------------------------------------------ */
/*  採用区分別の応募・内定数                                           */
/* ------------------------------------------------------------------ */

export async function fetchApplicationCountsByHiringType(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("applications")
    .select("id, status, applicant_id, profiles:applicant_id(hiring_type)")
    .eq("organization_id", orgId);
  return data;
}

/* ------------------------------------------------------------------ */
/*  採用目標                                                           */
/* ------------------------------------------------------------------ */

export async function fetchRecruitingTargets(
  client: SupabaseClient,
  orgId: string,
  fiscalYear: number
) {
  const { data } = await client
    .from("recruiting_targets")
    .select("hiring_type, target_type, target_value")
    .eq("organization_id", orgId)
    .eq("fiscal_year", fiscalYear);
  return data;
}

export async function upsertRecruitingTarget(
  client: SupabaseClient,
  orgId: string,
  fiscalYear: number,
  hiringType: string,
  targetType: string,
  targetValue: number
) {
  const { error } = await client.from("recruiting_targets").upsert(
    {
      organization_id: orgId,
      fiscal_year: fiscalYear,
      hiring_type: hiringType,
      target_type: targetType,
      target_value: targetValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,fiscal_year,hiring_type,target_type" }
  );
  return { error };
}

/* ------------------------------------------------------------------ */
/*  ダッシュボードウィジェット設定                                     */
/* ------------------------------------------------------------------ */

export async function fetchWidgetPreferences(
  client: SupabaseClient,
  userId: string,
  orgId: string,
  productTab: string
) {
  const { data } = await client
    .from("dashboard_widget_preferences")
    .select("widget_config")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .eq("product_tab", productTab)
    .maybeSingle();
  return data?.widget_config ?? null;
}

export async function upsertWidgetPreferences(
  client: SupabaseClient,
  userId: string,
  orgId: string,
  productTab: string,
  widgetConfig: unknown
) {
  const { error } = await client.from("dashboard_widget_preferences").upsert(
    {
      user_id: userId,
      organization_id: orgId,
      product_tab: productTab,
      widget_config: widgetConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,organization_id,product_tab" }
  );
  return { error };
}
