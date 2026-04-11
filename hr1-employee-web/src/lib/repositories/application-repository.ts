import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, CustomForm, Interview, Job } from "@/types/database";

export async function fetchApplications(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("applications")
    .select("*, jobs(*), profiles:applicant_id(*), application_steps(*)")
    .eq("organization_id", organizationId)
    .order("applied_at", { ascending: false });
  return (data ?? []) as Application[];
}

export async function fetchJobsForFilter(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Job[];
}

export async function fetchApplicationDetail(
  client: SupabaseClient,
  applicationId: string,
  organizationId: string
) {
  return client
    .from("applications")
    .select("*, jobs(*), profiles:applicant_id(*), application_steps(*)")
    .eq("id", applicationId)
    .eq("organization_id", organizationId)
    .single();
}

export async function updateApplicationStatus(
  client: SupabaseClient,
  applicationId: string,
  organizationId: string,
  status: string
) {
  return client
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("organization_id", organizationId);
}

/**
 * 選考ステップのステータスを更新する。
 *
 * `application_steps` テーブルは `organization_id` カラムを持たず、
 * テナント分離は親テーブル `applications` 経由で RLS ポリシーによって保証される。
 * そのためクライアント側クエリでは org_id フィルタを付けない（付けるとエラーになる）。
 * DB 側の RLS が必須防御線になっている点に注意すること。
 */
export async function updateStepStatus(
  client: SupabaseClient,
  stepId: string,
  data: {
    status: string;
    started_at?: string | null;
    completed_at?: string | null;
    related_id?: string;
  }
) {
  return client.from("application_steps").update(data).eq("id", stepId);
}

export async function fetchForms(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("custom_forms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomForm[];
}

export async function fetchInterviews(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("interviews")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Interview[];
}

export async function fetchFormResponses(
  client: SupabaseClient,
  formId: string,
  applicantId: string
) {
  const [{ data: fieldsData }, { data: responsesData }] = await Promise.all([
    client.from("form_fields").select("*").eq("form_id", formId).order("sort_order"),
    client.from("form_responses").select("*").eq("form_id", formId).eq("applicant_id", applicantId),
  ]);
  return { fields: fieldsData ?? [], responses: responsesData ?? [] };
}

export function subscribeToStepChanges(
  client: SupabaseClient,
  applicationId: string,
  onUpdate: () => void
) {
  const channel = client
    .channel(`application_steps:${applicationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "application_steps",
        filter: `application_id=eq.${applicationId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return channel;
}
