import type { SupabaseClient } from "@supabase/supabase-js";
import type { Faq } from "@/types/database";

export async function fetchPublishedFaqs(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("faqs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .in("target", ["employee", "both"])
    .order("sort_order", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Faq[];
}
