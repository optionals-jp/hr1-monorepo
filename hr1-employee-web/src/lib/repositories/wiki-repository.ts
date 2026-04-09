import type { SupabaseClient } from "@supabase/supabase-js";
import type { WikiPage } from "@/types/database";

export async function fetchPublishedPages(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("wiki_pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as WikiPage[];
}

export async function findById(client: SupabaseClient, id: string, organizationId: string) {
  const { data, error } = await client
    .from("wiki_pages")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .single();
  if (error) throw error;
  return data as WikiPage;
}
