import { useOrg } from "./org-context";
import { getSupabase } from "./supabase";
import { useQuery } from "./use-query";
import type { Profile, Department } from "@/types/database";

/**
 * 組織内の社員一覧を取得するフック
 */
export function useEmployees() {
  const { organization } = useOrg();
  return useQuery<
    { id: string; email: string; display_name: string | null; position: string | null }[]
  >(organization ? `employees-shared-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("user_organizations")
      .select(
        "user_id, profiles!user_organizations_user_id_fkey(id, email, display_name, position)"
      )
      .eq("organization_id", organization!.id);
    return (data ?? [])
      .map((row) => (row as unknown as { profiles: Profile }).profiles)
      .filter((p): p is Profile => p != null && p.role !== "applicant")
      .map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        position: p.position,
      }));
  });
}

/**
 * 組織内の部署一覧を取得するフック
 */
export function useDepartments() {
  const { organization } = useOrg();
  return useQuery<Department[]>(
    organization ? `departments-shared-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("name");
      return (data ?? []) as Department[];
    }
  );
}
