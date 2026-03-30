"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Application, Job } from "@/types/database";

export function useApplicationsList() {
  return useOrgQuery<Application[]>("applications", (orgId) =>
    applicantRepo.fetchApplications(getSupabase(), orgId)
  );
}

export function useJobsForFilter() {
  return useOrgQuery<Job[]>("jobs", (orgId) => applicantRepo.fetchJobs(getSupabase(), orgId));
}
