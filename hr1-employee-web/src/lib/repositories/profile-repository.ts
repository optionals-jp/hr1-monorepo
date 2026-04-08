import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Department } from "@/types/database";

export async function fetchEmployees(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("user_organizations")
    .select("user_id, profiles!user_organizations_user_id_fkey(id, email, display_name, position)")
    .eq("organization_id", organizationId);
  return (data ?? [])
    .map((row) => (row as unknown as { profiles: Profile }).profiles)
    .filter((p): p is Profile => p != null && p.role !== "applicant")
    .map((p) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      position: p.position,
    }));
}

export async function fetchDepartments(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  return (data ?? []) as Department[];
}
