import type { SupabaseClient } from "@supabase/supabase-js";

export interface CrmComment {
  id: string;
  organization_id: string;
  entity_type: "deal" | "company" | "contact" | "lead";
  entity_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null; email: string; avatar_url: string | null };
}

export async function fetchComments(
  client: SupabaseClient,
  organizationId: string,
  entityType: string,
  entityId: string
) {
  const { data, error } = await client
    .from("crm_comments")
    .select("*, profiles:author_id(display_name, email, avatar_url)")
    .eq("organization_id", organizationId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CrmComment[];
}

export async function createComment(
  client: SupabaseClient,
  data: {
    organization_id: string;
    entity_type: string;
    entity_id: string;
    author_id: string;
    body: string;
    mentions?: string[];
  }
) {
  const { data: created, error } = await client
    .from("crm_comments")
    .insert({ ...data, mentions: data.mentions ?? [] })
    .select("*, profiles:author_id(display_name, email, avatar_url)")
    .single();
  if (error) throw error;
  return created as CrmComment;
}

export async function deleteComment(client: SupabaseClient, id: string, organizationId: string) {
  const { error } = await client
    .from("crm_comments")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
