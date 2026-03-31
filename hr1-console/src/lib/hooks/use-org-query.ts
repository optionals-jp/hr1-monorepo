"use client";

import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as profileRepository from "@/lib/repositories/profile-repository";
import type { Department } from "@/types/database";
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
    return profileRepository.fetchEmployees(getSupabase(), organization!.id);
  });
}

export function useDepartments() {
  const { organization } = useOrg();
  return useQuery<Department[]>(
    organization ? `departments-shared-${organization.id}` : null,
    async () => {
      return profileRepository.fetchDepartments(getSupabase(), organization!.id);
    }
  );
}
