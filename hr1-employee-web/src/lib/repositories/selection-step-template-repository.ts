import type { SupabaseClient } from "@supabase/supabase-js";
import type { SelectionStepTemplate } from "@/types/database";

export async function findByOrg(
  client: SupabaseClient,
  organizationId: string
): Promise<SelectionStepTemplate[]> {
  const { data, error } = await client
    .from("selection_step_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SelectionStepTemplate[];
}

export async function createTemplate(
  client: SupabaseClient,
  params: {
    organization_id: string;
    name: string;
    step_type: string;
    description: string | null;
    sort_order: number;
  }
): Promise<SelectionStepTemplate> {
  const { data, error } = await client
    .from("selection_step_templates")
    .insert(params)
    .select("*")
    .single();
  if (error) throw error;
  return data as SelectionStepTemplate;
}

export async function updateTemplate(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  patch: {
    name?: string;
    step_type?: string;
    description?: string | null;
    sort_order?: number;
  }
): Promise<void> {
  const { error } = await client
    .from("selection_step_templates")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteTemplate(
  client: SupabaseClient,
  id: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("selection_step_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
