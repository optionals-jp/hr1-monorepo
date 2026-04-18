"use client";

import { useMemo, useState } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useTabParam } from "@hr1/shared-ui";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicationRepo from "@/lib/repositories/application-repository";
import {
  applicationStatusLabels as statusLabels,
  ApplicationStatus,
  StepStatus,
} from "@/lib/constants";
import type { Application, Job } from "@/types/database";

/**
 * 応募画面の上部サマリ（総応募数・新卒・中途・選考中・内定）用の集計結果。
 * タブでの絞り込みや検索語には影響されず、常に全応募イベントを母集団とする。
 * 1 人の候補者が複数求人に応募した場合は別々にカウントされる（= 応募単位）。
 */
export interface ApplicationsSummary {
  total: number;
  newGrad: number;
  midCareer: number;
  active: number;
  offered: number;
  offerAccepted: number;
}

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
  // URL 検索クエリの `?tab=` でタブ状態を保持。直リンク・戻る/進むで状態が復元される。
  const [statusFilter, setStatusFilter] = useTabParam<string>("all");
  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterHiringType, setFilterHiringType] = useState<"all" | "new_grad" | "mid_career">(
    "all"
  );

  const { data: jobs = [] } = useJobsForFilter();

  const {
    data: applications = [],
    isLoading,
    error: applicationsError,
    mutate: mutateApplications,
  } = useApplicationsList();

  /**
   * 画面上部に表示する集計。`applications` 全件を対象にするため、
   * タブ（statusFilter）・求人絞り込み・検索は掛けない。
   */
  const summary = useMemo<ApplicationsSummary>(() => {
    let newGrad = 0;
    let midCareer = 0;
    let active = 0;
    let offered = 0;
    let offerAccepted = 0;

    for (const app of applications) {
      const hiringType = app.profiles?.hiring_type;
      if (hiringType === "new_grad") newGrad++;
      else if (hiringType === "mid_career") midCareer++;

      if (app.status === ApplicationStatus.Active) active++;
      else if (app.status === ApplicationStatus.Offered) offered++;
      else if (app.status === ApplicationStatus.OfferAccepted) offerAccepted++;
    }

    return {
      total: applications.length,
      newGrad,
      midCareer,
      active,
      offered,
      offerAccepted,
    };
  }, [applications]);

  const filtered = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (filterJobId !== "all" && app.job_id !== filterJobId) return false;
    if (filterSource !== "all" && app.source !== filterSource) return false;
    if (filterHiringType !== "all" && app.profiles?.hiring_type !== filterHiringType) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = app.profiles?.display_name ?? "";
      const email = app.profiles?.email ?? "";
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
    filterSource,
    setFilterSource,
    filterHiringType,
    setFilterHiringType,
    jobs,
    applications,
    summary,
    isLoading,
    applicationsError,
    mutateApplications,
    filtered,
    getCurrentStepLabel,
  };
}
