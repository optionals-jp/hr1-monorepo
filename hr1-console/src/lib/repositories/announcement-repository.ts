import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("announcements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Announcement[];
}

export async function create(
  client: SupabaseClient,
  data: {
    organization_id: string;
    title: string;
    body: string;
    target: string;
    is_pinned: boolean;
    created_by: string;
  }
) {
  return client.from("announcements").insert(data);
}

export async function update(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: { title: string; body: string; target: string; is_pinned: boolean }
) {
  return client
    .from("announcements")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function remove(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("announcements").delete().eq("id", id).eq("organization_id", organizationId);
}

export async function updatePublishedAt(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  publishedAt: string | null
) {
  return client
    .from("announcements")
    .update({ published_at: publishedAt })
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function updatePin(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  isPinned: boolean
) {
  return client
    .from("announcements")
    .update({ is_pinned: isPinned })
    .eq("id", id)
    .eq("organization_id", organizationId);
}
