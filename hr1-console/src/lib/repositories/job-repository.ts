import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, JobStep, Application, AuditLog } from "@/types/database";

export interface JobDetailResult {
  job: Job | null;
  steps: JobStep[];
  applications: Application[];
  auditLogs: AuditLog[];
}

/**
 * 求人詳細データを取得する
 * 全クエリに organization_id フィルタを適用し、テナント分離を保証する
 */
export async function fetchJobDetail(
  client: SupabaseClient,
  jobId: string,
  organizationId: string
): Promise<JobDetailResult> {
  const [{ data: jobData }, { data: stepsData }, { data: appsData }, { data: logsData }] =
    await Promise.all([
      client
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("organization_id", organizationId)
        .single(),
      client.from("job_steps").select("*").eq("job_id", jobId).order("step_order"),
      client
        .from("applications")
        .select("*, profiles:applicant_id(display_name, email), application_steps(*)")
        .eq("job_id", jobId)
        .eq("organization_id", organizationId)
        .order("applied_at", { ascending: false }),
      client
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("table_name", "jobs")
        .eq("record_id", jobId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return {
    job: jobData,
    steps: stepsData ?? [],
    applications: (appsData as Application[]) ?? [],
    auditLogs: logsData ?? [],
  };
}

/**
 * タスク詳細データを取得する
 */
export async function fetchTaskDetail(
  client: SupabaseClient,
  taskId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("tasks")
    .select(
      "*, creator:profiles!tasks_created_by_fkey(display_name, email), projects(id, name), project_teams(id, name)"
    )
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .single();

  if (error) return null;
  return data;
}
