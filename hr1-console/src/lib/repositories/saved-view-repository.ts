import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmEntityType, CrmSavedView, CrmSavedViewConfig } from "@/types/database";

export async function fetchSavedViews(
  client: SupabaseClient,
  organizationId: string,
  entityType: CrmEntityType
) {
  const { data } = await client
    .from("crm_saved_views")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .order("created_at");
  return (data ?? []) as CrmSavedView[];
}

export async function createSavedView(
  client: SupabaseClient,
  data: {
    organization_id: string;
    user_id: string;
    entity_type: CrmEntityType;
    name: string;
    is_shared?: boolean;
    config: CrmSavedViewConfig;
  }
) {
  const { data: result, error } = await client
    .from("crm_saved_views")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as CrmSavedView;
}

export async function updateSavedView(
  client: SupabaseClient,
  id: string,
  data: Partial<Pick<CrmSavedView, "name" | "is_shared" | "is_default" | "config">>
) {
  return client
    .from("crm_saved_views")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteSavedView(client: SupabaseClient, id: string) {
  return client.from("crm_saved_views").delete().eq("id", id);
}
