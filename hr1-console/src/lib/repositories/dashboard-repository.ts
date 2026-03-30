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
