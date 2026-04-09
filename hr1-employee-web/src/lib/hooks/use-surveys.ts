"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as surveyRepo from "@/lib/repositories/survey-repository";
import type { PulseSurvey } from "@/types/database";

export function useActiveSurveys() {
  return useOrgQuery<PulseSurvey[]>("active-surveys", (orgId) =>
    surveyRepo.fetchActiveSurveys(getSupabase(), orgId)
  );
}
