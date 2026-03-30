"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Profile } from "@/types/database";

export function useApplicantsList() {
  return useOrgQuery<Profile[]>("applicants", (orgId) =>
    applicantRepo.findByOrg(getSupabase(), orgId)
  );
}

export async function addApplicant(params: {
  email: string;
  display_name: string | null;
  organization_id: string;
  hiring_type: string | null;
  graduation_year: number | undefined;
}): Promise<void> {
  const { data, error } = await getSupabase().functions.invoke("create-user", {
    body: {
      email: params.email,
      display_name: params.display_name,
      role: "applicant",
      organization_id: params.organization_id,
      hiring_type: params.hiring_type,
      graduation_year: params.graduation_year,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
