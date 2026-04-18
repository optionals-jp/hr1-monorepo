import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, CustomForm, Interview, Job, Offer } from "@/types/database";

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

export async function rejectApplication(
  client: SupabaseClient,
  applicationId: string,
  organizationId: string,
  data: { rejection_category?: string; rejection_reason?: string }
) {
  return client
    .from("applications")
    .update({ status: "rejected", ...data })
    .eq("id", applicationId)
    .eq("organization_id", organizationId);
}

export async function updateApplicationSource(
  client: SupabaseClient,
  applicationId: string,
  organizationId: string,
  source: string | null
) {
  return client
    .from("applications")
    .update({ source })
    .eq("id", applicationId)
    .eq("organization_id", organizationId);
}

export async function bulkUpdateApplicationStatus(
  client: SupabaseClient,
  applicationIds: string[],
  organizationId: string,
  status: string
) {
  return client
    .from("applications")
    .update({ status })
    .in("id", applicationIds)
    .eq("organization_id", organizationId);
}

export async function bulkRejectApplications(
  client: SupabaseClient,
  applicationIds: string[],
  organizationId: string,
  data: { rejection_category?: string; rejection_reason?: string }
) {
  return client
    .from("applications")
    .update({ status: "rejected", ...data })
    .in("id", applicationIds)
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
    form_id?: string | null;
    interview_id?: string | null;
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

export async function createOffer(
  client: SupabaseClient,
  offer: {
    application_id: string;
    organization_id: string;
    salary?: string;
    start_date?: string;
    department?: string;
    notes?: string;
    expires_at?: string;
    created_by?: string;
  }
) {
  return client.from("offers").insert(offer).select().single();
}

export async function fetchOffer(client: SupabaseClient, applicationId: string) {
  const { data } = await client
    .from("offers")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  return data as Offer | null;
}

export async function updateOffer(
  client: SupabaseClient,
  offerId: string,
  data: {
    salary?: string;
    start_date?: string;
    department?: string;
    notes?: string;
    expires_at?: string;
  }
) {
  return client.from("offers").update(data).eq("id", offerId);
}

/**
 * 個別応募にアドホックなステップを追加する。
 *
 * `source: 'ad_hoc'` を強制的に設定することで RLS の挿入ポリシーを通す。
 * `step_order` は呼び出し側で前後ステップの中間値などを採番して渡すこと（例: 2 と 3 の間なら 2.5）。
 * これにより既存ステップの再採番なしに任意位置へ挿入できる。
 */
export async function insertAdHocStep(
  client: SupabaseClient,
  data: {
    application_id: string;
    step_type: string;
    label: string;
    step_order: number;
    form_id?: string | null;
    interview_id?: string | null;
    screening_type?: string | null;
    requires_review?: boolean;
    is_optional?: boolean;
    description?: string | null;
    created_by_user_id?: string | null;
  }
) {
  return client
    .from("application_steps")
    .insert({
      ...data,
      source: "ad_hoc",
      status: "pending",
      requires_review: data.requires_review ?? false,
      is_optional: data.is_optional ?? false,
    })
    .select()
    .single();
}

/**
 * アドホックなステップ（`source='ad_hoc'` かつ `status='pending'`）の編集。
 * RLS によりサーバ側でも `ad_hoc + pending` 以外への UPDATE はブロックされる。
 */
export async function updateAdHocStep(
  client: SupabaseClient,
  stepId: string,
  data: {
    label?: string;
    step_type?: string;
    form_id?: string | null;
    interview_id?: string | null;
    screening_type?: string | null;
    requires_review?: boolean;
    is_optional?: boolean;
    description?: string | null;
    step_order?: number;
  }
) {
  return client.from("application_steps").update(data).eq("id", stepId);
}

/**
 * アドホックなステップの削除。
 * RLS によりサーバ側でも `ad_hoc + pending` 以外の DELETE はブロックされる。
 */
export async function deleteAdHocStep(client: SupabaseClient, stepId: string) {
  return client.from("application_steps").delete().eq("id", stepId);
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
