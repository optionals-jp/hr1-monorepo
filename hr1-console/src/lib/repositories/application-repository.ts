import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomForm, Interview } from "@/types/database";

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

// application_steps はorganization_idカラムを持たない（親テーブル applications 経由でテナント分離）
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

export async function convertToEmployee(
  client: SupabaseClient,
  applicantId: string,
  organizationId: string,
  hireDate: string
) {
  await client
    .from("profiles")
    .update({ role: "employee", hire_date: hireDate })
    .eq("id", applicantId);

  await client
    .from("user_organizations")
    .upsert(
      { user_id: applicantId, organization_id: organizationId },
      { onConflict: "user_id,organization_id" }
    );

  await client.from("notifications").insert({
    organization_id: organizationId,
    user_id: applicantId,
    type: "general",
    title: "入社が確定しました",
    body: `${hireDate} 付けで社員として登録されました。社員アプリからログインできます。`,
    is_read: false,
  });
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
