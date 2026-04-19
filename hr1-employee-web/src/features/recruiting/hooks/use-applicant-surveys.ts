"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";

export interface ApplicantSurvey {
  id: string;
  title: string;
}

export function useApplicantSurveys() {
  return useOrgQuery<ApplicantSurvey[]>("applicant-surveys", async (orgId) => {
    const { data } = await getSupabase()
      .from("pulse_surveys")
      .select("id, title")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .in("target", ["applicant", "both"])
      .order("created_at", { ascending: false });
    return (data ?? []) as ApplicantSurvey[];
  });
}
