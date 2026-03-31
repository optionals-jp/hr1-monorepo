import type { SupabaseClient } from "@supabase/supabase-js";
import type { WikiPage } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("wiki_pages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as WikiPage[];
}

export async function findById(client: SupabaseClient, id: string, organizationId: string) {
  const { data } = await client
    .from("wiki_pages")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();
  return (data ?? null) as WikiPage | null;
}

export async function create(
  client: SupabaseClient,
  data: {
    organization_id: string;
    title: string;
    content: string;
    category: string | null;
    parent_id: string | null;
    created_by: string;
    sort_order: number;
  }
) {
  return client.from("wiki_pages").insert(data);
}

export async function update(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: {
    title: string;
    content: string;
    category?: string | null;
    parent_id?: string | null;
    updated_by: string;
    is_published?: boolean;
  }
) {
  return client.from("wiki_pages").update(data).eq("id", id).eq("organization_id", organizationId);
}

export async function remove(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("wiki_pages").delete().eq("id", id).eq("organization_id", organizationId);
}
