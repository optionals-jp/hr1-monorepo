import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Application, Job } from "@/types/database";

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
    .select("*, custom_forms(title)")
    .eq("applicant_id", applicantId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchInterviewSlots(client: SupabaseClient, applicantId: string) {
  const { data } = await client
    .from("interview_slots")
    .select("*, interviews(title, location, notes)")
    .eq("application_id", applicantId)
    .order("start_at", { ascending: false });
  return data ?? [];
}

// --- Jobs list (for applications page) ---

export async function fetchJobs(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("title");
  return (data ?? []) as Job[];
}

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

export async function deleteJob(client: SupabaseClient, jobId: string, organizationId: string) {
  const { count } = await client
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("organization_id", organizationId);

  if (count && count > 0) {
    return { error: { message: `この求人には${count}件の応募があるため削除できません` } };
  }

  return client.from("jobs").delete().eq("id", jobId).eq("organization_id", organizationId);
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

export async function fetchApplications(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("applications")
    .select(
      "*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)"
    )
    .eq("organization_id", organizationId)
    .order("applied_at", { ascending: false });
  return (data ?? []) as Application[];
}
