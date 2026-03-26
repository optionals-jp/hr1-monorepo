"use client";

import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import type { Profile, Department } from "@/types/database";
import type { SWRConfiguration } from "swr";

/**
 * 組織スコープ付きのuseQueryラッパー。
 * organization が null の場合はフェッチをスキップする。
 */
export function useOrgQuery<T>(
  key: string,
  fetcher: (orgId: string) => Promise<T>,
  config?: SWRConfiguration<T>
) {
  const { organization } = useOrg();
  return useQuery<T>(
    organization ? `${key}-${organization.id}` : null,
    () => fetcher(organization!.id),
    config
  );
}

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
