"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Job } from "@/types/database";

interface AppCounts {
  total: number;
  offered: number;
}

export function useJobsList() {
  return useOrgQuery<Job[]>("jobs", (orgId) =>
    applicantRepo.fetchJobsWithCounts(getSupabase(), orgId)
  );
}

export function useJobAppCounts() {
  return useOrgQuery<Record<string, AppCounts>>("job-app-counts", (orgId) =>
    applicantRepo.fetchApplicationCounts(getSupabase(), orgId)
  );
}

export async function deleteJob(jobId: string, organizationId: string) {
  return applicantRepo.deleteJob(getSupabase(), jobId, organizationId);
}

export function useNewJob() {
  const { organization } = useOrg();

  const createJob = async (params: {
    title: string;
    description: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    salaryRange: string | null;
    status: string;
    steps: { step_type: string; label: string }[];
  }) => {
    if (!organization) throw new Error("Organization not found");
    const client = getSupabase();
    const jobId = crypto.randomUUID();

    const { error: jobError } = await applicantRepo.createJob(client, {
      id: jobId,
      organization_id: organization.id,
      title: params.title,
      description: params.description,
      department: params.department,
      location: params.location,
      employment_type: params.employmentType,
      salary_range: params.salaryRange,
      status: params.status,
    });
    if (jobError) throw jobError;

    if (params.steps.length > 0) {
      const { error: stepsError } = await applicantRepo.createJobSteps(
        client,
        params.steps.map((step, index) => ({
          id: crypto.randomUUID(),
          job_id: jobId,
          step_type: step.step_type,
          step_order: index + 1,
          label: step.label,
        }))
      );
      if (stepsError) throw stepsError;
    }
  };

  return { createJob };
}
