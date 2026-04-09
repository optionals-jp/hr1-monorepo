"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as employeeRepo from "@/lib/repositories/employee-repository";
import type { Profile } from "@/types/database";

export function useEmployees() {
  return useOrgQuery<Profile[]>("employees", (orgId) =>
    employeeRepo.fetchEmployees(getSupabase(), orgId)
  );
}

export function useEmployee(userId: string) {
  return useOrgQuery<Profile>(`employee-${userId}`, (orgId) =>
    employeeRepo.fetchEmployee(getSupabase(), orgId, userId)
  );
}
