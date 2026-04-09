import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement } from "@/types/database";

export async function fetchPublishedAnnouncements(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("announcements")
    .select("*")
    .eq("organization_id", organizationId)
    .not("published_at", "is", null)
    .in("target", ["all", "employee"])
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}
