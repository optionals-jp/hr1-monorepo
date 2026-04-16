import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job, JobStep, Application, Interview } from "@/types/database";

export interface JobDetailResult {
  job: Job | null;
  steps: JobStep[];
  applications: Application[];
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
  const [{ data: jobData }, { data: stepsData }, { data: appsData }] = await Promise.all([
    client.from("jobs").select("*").eq("id", jobId).eq("organization_id", organizationId).single(),
    client.from("job_steps").select("*").eq("job_id", jobId).order("step_order"),
    client
      .from("applications")
      .select("*, profiles:applicant_id(display_name, email), application_steps(*)")
      .eq("job_id", jobId)
      .eq("organization_id", organizationId)
      .order("applied_at", { ascending: false }),
  ]);

  return {
    job: jobData,
    steps: stepsData ?? [],
    applications: (appsData as Application[]) ?? [],
  };
}

export async function updateJobStatus(
  client: SupabaseClient,
  jobId: string,
  organizationId: string,
  status: string
) {
  return client
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("organization_id", organizationId);
}

export async function updateJob(
  client: SupabaseClient,
  jobId: string,
  organizationId: string,
  data: {
    title: string;
    description: string | null;
    department: string | null;
    location: string | null;
    employment_type: string | null;
    salary_range: string | null;
  }
) {
  return client.from("jobs").update(data).eq("id", jobId).eq("organization_id", organizationId);
}

export async function insertJobStep(
  client: SupabaseClient,
  data: {
    id: string;
    job_id: string;
    step_type: string;
    step_order: number;
    label: string;
    form_id: string | null;
    interview_id: string | null;
    template_id: string | null;
    screening_type?: string | null;
    requires_review?: boolean;
  }
) {
  return client.from("job_steps").insert(data);
}

// job_steps はorganization_idカラムを持たない（親テーブル jobs 経由でテナント分離）
export async function updateJobStep(
  client: SupabaseClient,
  stepId: string,
  data: {
    step_type: string;
    label: string;
    form_id: string | null;
    interview_id: string | null;
    step_order?: number;
    screening_type?: string | null;
    requires_review?: boolean;
  }
) {
  return client
    .from("job_steps")
    .update({ ...data, template_id: null })
    .eq("id", stepId);
}

// job_steps はorganization_idカラムを持たない（親テーブル jobs 経由でテナント分離）
export async function deleteJobStep(client: SupabaseClient, stepId: string) {
  return client.from("job_steps").delete().eq("id", stepId);
}

export async function fetchForms(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("custom_forms")
    .select("id, title")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchInterviews(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("interviews")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data as Interview[]) ?? [];
}

export async function deleteJob(client: SupabaseClient, jobId: string, organizationId: string) {
  return client.from("jobs").delete().eq("id", jobId).eq("organization_id", organizationId);
}

export async function fetchActivityLogs(
  client: SupabaseClient,
  organizationId: string,
  opts: { parentType?: string; parentId?: string; limit?: number } = {}
) {
  let query = client
    .from("activity_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (opts.parentType) query = query.eq("parent_type", opts.parentType);
  if (opts.parentId) query = query.eq("parent_id", opts.parentId);
  query = query.limit(opts.limit ?? 200);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
