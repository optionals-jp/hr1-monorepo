import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmEntityType, CrmFieldDefinition, CrmFieldValue } from "@/types/database";

// --- Field Definitions ---

export async function fetchFieldDefinitions(
  client: SupabaseClient,
  organizationId: string,
  entityType?: CrmEntityType
) {
  let query = client
    .from("crm_field_definitions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order");
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }
  const { data } = await query;
  return (data ?? []) as CrmFieldDefinition[];
}

export async function createFieldDefinition(
  client: SupabaseClient,
  data: {
    organization_id: string;
    entity_type: CrmEntityType;
    field_type: string;
    label: string;
    description?: string | null;
    placeholder?: string | null;
    is_required?: boolean;
    options?: string[] | null;
    field_group?: string | null;
    sort_order?: number;
  }
) {
  const { data: result, error } = await client
    .from("crm_field_definitions")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as CrmFieldDefinition;
}

export async function updateFieldDefinition(
  client: SupabaseClient,
  id: string,
  data: Partial<
    Pick<
      CrmFieldDefinition,
      | "label"
      | "description"
      | "placeholder"
      | "is_required"
      | "options"
      | "field_group"
      | "sort_order"
      | "field_type"
    >
  >
) {
  return client
    .from("crm_field_definitions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteFieldDefinition(client: SupabaseClient, id: string) {
  return client.from("crm_field_definitions").delete().eq("id", id);
}

// --- Field Values ---

export async function fetchFieldValues(
  client: SupabaseClient,
  entityId: string,
  entityType: CrmEntityType
) {
  const { data } = await client
    .from("crm_field_values")
    .select("*")
    .eq("entity_id", entityId)
    .eq("entity_type", entityType);
  return (data ?? []) as CrmFieldValue[];
}

export async function upsertFieldValue(
  client: SupabaseClient,
  data: {
    organization_id: string;
    field_id: string;
    entity_id: string;
    entity_type: CrmEntityType;
    value: string | null;
  }
) {
  const { error } = await client.from("crm_field_values").upsert(
    {
      ...data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "field_id,entity_id" }
  );
  if (error) throw error;
}

export async function upsertFieldValues(
  client: SupabaseClient,
  values: {
    organization_id: string;
    field_id: string;
    entity_id: string;
    entity_type: CrmEntityType;
    value: string | null;
  }[]
) {
  if (values.length === 0) return;
  const { error } = await client.from("crm_field_values").upsert(
    values.map((v) => ({ ...v, updated_at: new Date().toISOString() })),
    { onConflict: "field_id,entity_id" }
  );
  if (error) throw error;
}
