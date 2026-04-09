import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export async function fetchEmployees(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("user_organizations")
    .select(
      "user_id, profiles:user_id(id, display_name, email, avatar_url, department, position, role)"
    )
    .eq("organization_id", organizationId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => (r as unknown as { profiles: Profile }).profiles)
    .filter((p) => p && (p.role === "employee" || p.role === "admin")) as Profile[];
}
