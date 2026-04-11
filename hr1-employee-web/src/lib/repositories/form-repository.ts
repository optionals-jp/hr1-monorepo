import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomForm, FormField } from "@/types/database";

// ─── Forms ───

export async function fetchForms(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("custom_forms")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CustomForm[];
}

export async function fetchFormById(client: SupabaseClient, id: string, orgId: string) {
  const { data } = await client
    .from("custom_forms")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
  return { data: data as CustomForm | null };
}

/**
 * custom_forms に行を作成し、DB 側で採番された id を返す。
 * `row.id` を渡してはならない（uuid カラムに非 UUID 文字列を入れるとキャストエラー）。
 */
export async function createForm(
  client: SupabaseClient,
  row: {
    organization_id: string;
    title: string;
    description: string | null;
    target: string;
  }
): Promise<string> {
  const { data, error } = await client.from("custom_forms").insert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateForm(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Record<string, unknown>
) {
  return client
    .from("custom_forms")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function deleteForm(client: SupabaseClient, id: string, orgId: string) {
  return client.from("custom_forms").delete().eq("id", id).eq("organization_id", orgId);
}

// ─── Fields ───

export async function fetchFields(client: SupabaseClient, formId: string) {
  const { data } = await client
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order");
  return (data ?? []) as FormField[];
}

export async function insertFields(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("form_fields").insert(rows);
}

export async function deleteFields(client: SupabaseClient, ids: string[]) {
  return client.from("form_fields").delete().in("id", ids);
}

export async function deleteFieldsByForm(client: SupabaseClient, formId: string) {
  return client.from("form_fields").delete().eq("form_id", formId);
}

export async function updateField(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("form_fields").update(data).eq("id", id);
}

// ─── Responses ───

export async function fetchResponses(client: SupabaseClient, formId: string) {
  return client.from("form_responses").select("*").eq("form_id", formId);
}

export async function fetchResponseCount(client: SupabaseClient, formId: string) {
  const { count } = await client
    .from("form_responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);
  return count ?? 0;
}

// ─── Profiles ───

export async function fetchProfiles(client: SupabaseClient, ids: string[]) {
  return client.from("profiles").select("id, display_name, email").in("id", ids);
}
