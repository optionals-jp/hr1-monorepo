import type { SupabaseClient } from "@supabase/supabase-js";
import type { SelectionFlow } from "@/types/database";

export async function findById(client: SupabaseClient, id: string): Promise<SelectionFlow | null> {
  const { data, error } = await client.from("selection_flows").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as SelectionFlow;
}

export async function findByOrg(
  client: SupabaseClient,
  organizationId: string
): Promise<SelectionFlow[]> {
  const { data, error } = await client
    .from("selection_flows")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SelectionFlow[];
}

export async function createFlow(
  client: SupabaseClient,
  params: {
    organization_id: string;
    name: string;
    description: string | null;
  }
): Promise<SelectionFlow> {
  const { data, error } = await client.from("selection_flows").insert(params).select("*").single();
  if (error) throw error;
  return data as SelectionFlow;
}

export async function updateFlow(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  patch: {
    name?: string;
    description?: string | null;
  }
): Promise<void> {
  const { error } = await client
    .from("selection_flows")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function deleteFlow(
  client: SupabaseClient,
  id: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("selection_flows")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
