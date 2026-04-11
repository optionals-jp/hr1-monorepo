"use client";

import { useState } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicationRepo from "@/lib/repositories/application-repository";
import { applicationStatusLabels as statusLabels, StepStatus } from "@/lib/constants";
import type { Application, Job } from "@/types/database";

export function useApplicationsList() {
  return useOrgQuery<Application[]>("applications", (orgId) =>
    applicationRepo.fetchApplications(getSupabase(), orgId)
  );
}

export function useJobsForFilter() {
  return useOrgQuery<Job[]>("jobs-for-filter", (orgId) =>
    applicationRepo.fetchJobsForFilter(getSupabase(), orgId)
  );
}

export function useApplicationsPage() {
  useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterJobId, setFilterJobId] = useState<string>("all");

  const { data: jobs = [] } = useJobsForFilter();

  const {
    data: applications = [],
    isLoading,
    error: applicationsError,
    mutate: mutateApplications,
  } = useApplicationsList();

  const filtered = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (filterJobId !== "all" && app.job_id !== filterJobId) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (app.profiles as unknown as { display_name: string | null })?.display_name ?? "";
      const email = (app.profiles as unknown as { email: string })?.email ?? "";
      const jobTitle = app.jobs?.title ?? "";
      if (
        !name.toLowerCase().includes(s) &&
        !email.toLowerCase().includes(s) &&
        !jobTitle.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const getCurrentStepLabel = (app: Application): string => {
    const steps = app.application_steps ?? [];
    const inProgress = steps.find((s) => s.status === StepStatus.InProgress);
    if (inProgress) return inProgress.label;
    const allCompleted = steps.every(
      (s) => s.status === StepStatus.Completed || s.status === StepStatus.Skipped
    );
    if (allCompleted && steps.length > 0) return "全ステップ完了";
    return statusLabels[app.status];
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filterJobId,
    setFilterJobId,
    jobs,
    applications,
    isLoading,
    applicationsError,
    mutateApplications,
    filtered,
    getCurrentStepLabel,
  };
}
