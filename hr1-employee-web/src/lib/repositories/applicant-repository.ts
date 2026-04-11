import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_FUNCTIONS } from "@hr1/shared-ui/lib/supabase-functions";
import type { Profile, Application, Job } from "@/types/database";

/**
 * 応募者を作成する（Supabase Edge Function `create-user` 経由）。
 *
 * 認証ユーザー作成は GoTrue の内部処理が絡むため必ず Edge Function を通す。
 * この関数はエラーを握り潰さず throw するので、呼び出し元で try/catch すること。
 */
export async function createApplicant(
  client: SupabaseClient,
  params: {
    email: string;
    display_name: string | null;
    organization_id: string;
    hiring_type: string | null;
    graduation_year?: number;
    send_invite?: boolean;
  }
): Promise<void> {
  const { data, error } = await client.functions.invoke(SUPABASE_FUNCTIONS.CREATE_USER, {
    body: {
      email: params.email,
      display_name: params.display_name,
      role: "applicant",
      organization_id: params.organization_id,
      hiring_type: params.hiring_type,
      graduation_year: params.graduation_year,
      send_invite: params.send_invite,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("profiles!inner(*)")
    .eq("organization_id", organizationId)
    .eq("profiles.role", "applicant");

  return (data ?? [])
    .map((row) => (row as unknown as { profiles: Profile }).profiles)
    .filter(Boolean) as Profile[];
}

export async function fetchApplicantApplications(
  client: SupabaseClient,
  applicantId: string,
  organizationId: string
) {
  const { data } = await client
    .from("applications")
    .select("*, jobs(*), application_steps(*)")
    .eq("applicant_id", applicantId)
    .eq("organization_id", organizationId)
    .order("applied_at", { ascending: false });
  return (data ?? []) as Application[];
}

export async function fetchProfile(client: SupabaseClient, id: string) {
  const { data } = await client.from("profiles").select("*").eq("id", id).single();
  return data as Profile | null;
}

export async function fetchFormResponses(
  client: SupabaseClient,
  applicantId: string,
  organizationId: string
) {
  const { data } = await client
    .from("form_responses")
    .select("*, custom_forms!inner(title)")
    .eq("applicant_id", applicantId)
    .eq("custom_forms.organization_id", organizationId)
    .order("submitted_at", { ascending: false });
  return data ?? [];
}

export async function fetchInterviewSlotsByApplicant(
  client: SupabaseClient,
  applicantId: string,
  organizationId: string
) {
  const { data: apps } = await client
    .from("applications")
    .select("id")
    .eq("applicant_id", applicantId)
    .eq("organization_id", organizationId);
  const appIds = (apps ?? []).map((a) => a.id);
  if (appIds.length === 0) return [];

  const { data } = await client
    .from("interview_slots")
    .select("*, interviews(title, location, notes)")
    .in("application_id", appIds)
    .order("start_at", { ascending: false });
  return data ?? [];
}

// --- Jobs list (for jobs page) ---

export async function fetchJobsWithCounts(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Job[];
}

export async function fetchApplicationCounts(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("applications")
    .select("job_id, status")
    .eq("organization_id", organizationId);

  const counts: Record<string, { total: number; offered: number }> = {};
  for (const row of data ?? []) {
    if (!counts[row.job_id]) counts[row.job_id] = { total: 0, offered: 0 };
    counts[row.job_id].total++;
    if (row.status === "offered") counts[row.job_id].offered++;
  }
  return counts;
}

export async function createJob(
  client: SupabaseClient,
  data: {
    id: string;
    organization_id: string;
    title: string;
    description: string;
    department: string | null;
    location: string | null;
    employment_type: string | null;
    salary_range: string | null;
    status: string;
  }
) {
  return client.from("jobs").insert(data);
}

export async function createJobSteps(
  client: SupabaseClient,
  steps: {
    id: string;
    job_id: string;
    step_type: string;
    step_order: number;
    label: string;
  }[]
) {
  return client.from("job_steps").insert(steps);
}

export async function fetchLinkedForms(client: SupabaseClient, formIds: string[]) {
  const { data } = await client.from("custom_forms").select("id, title").in("id", formIds);
  return new Map((data ?? []).map((f) => [f.id, f.title]));
}

export async function fetchLinkedInterviews(client: SupabaseClient, interviewIds: string[]) {
  const { data } = await client
    .from("interviews")
    .select("id, title, status")
    .in("id", interviewIds);
  return new Map((data ?? []).map((i) => [i.id, i]));
}
