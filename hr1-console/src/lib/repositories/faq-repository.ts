import type { SupabaseClient } from "@supabase/supabase-js";
import type { Faq } from "@/types/database";

export async function findByOrg(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("faqs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Faq[];
}

export async function create(
  client: SupabaseClient,
  data: {
    organization_id: string;
    question: string;
    answer: string;
    category: string;
    target: string;
    sort_order: number;
  }
) {
  return client.from("faqs").insert(data);
}

export async function update(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: {
    question: string;
    answer: string;
    category: string;
    target: string;
    updated_at: string;
  }
) {
  return client.from("faqs").update(data).eq("id", id).eq("organization_id", organizationId);
}

export async function remove(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("faqs").delete().eq("id", id).eq("organization_id", organizationId);
}

export async function togglePublished(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  isPublished: boolean
) {
  return client
    .from("faqs")
    .update({ is_published: isPublished })
    .eq("id", id)
    .eq("organization_id", organizationId);
}
