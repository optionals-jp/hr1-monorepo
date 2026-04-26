"use client";

import { useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useThreadsList } from "@/lib/hooks/use-messages-page";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicationRepo from "@/lib/repositories/application-repository";
import { ApplicationStatus, StepStatus } from "@/lib/constants";
import type { Application, Interview, InterviewSlot, Job, Offer } from "@/types/database";
import { useApplicationsList } from "./use-applications-page";
import { useJobsList } from "./use-jobs-page";
import { useSchedulingList } from "./use-scheduling";

type InterviewWithSlots = Interview & { interview_slots: InterviewSlot[] };

interface AlertCounts {
  offersExpiring: number;
  stepsOverdue: number;
  stepsDueToday: number;
  interviewsScheduling: number;
  unreadApplicantMessages: number;
}

interface KpiCounts {
  openJobs: number;
  activeApplications: number;
  interviewsThisWeek: number;
  offered: number;
  appliedThisMonth: number;
}

export interface UpcomingInterviewEntry {
  interviewId: string;
  slotId: string;
  startAt: string;
  endAt: string;
  title: string;
  location: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  applicationId: string | null;
  jobTitle: string | null;
}

function startOfDayJst(d: Date): number {
  const local = new Date(d);
  local.setHours(0, 0, 0, 0);
  return local.getTime();
}

function endOfDayJst(d: Date): number {
  const local = new Date(d);
  local.setHours(23, 59, 59, 999);
  return local.getTime();
}

function startOfIsoWeek(d: Date): number {
  const local = new Date(d);
  local.setHours(0, 0, 0, 0);
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return local.getTime();
}

function endOfIsoWeek(d: Date): number {
  const start = new Date(startOfIsoWeek(d));
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start.getTime();
}

function startOfMonth(d: Date): number {
  const local = new Date(d.getFullYear(), d.getMonth(), 1);
  return local.getTime();
}

export function useRecruitingDashboard() {
  const applicationsQuery = useApplicationsList();
  const jobsQuery = useJobsList();
  const interviewsQuery = useSchedulingList();
  const offersQuery = useOrgQuery<Offer[]>("org-offers", (orgId) =>
    applicationRepo.fetchOrgOffers(getSupabase(), orgId)
  );
  const threadsQuery = useThreadsList();

  const isLoading =
    applicationsQuery.isLoading ||
    jobsQuery.isLoading ||
    interviewsQuery.isLoading ||
    offersQuery.isLoading ||
    threadsQuery.isLoading;

  const error =
    applicationsQuery.error ||
    jobsQuery.error ||
    interviewsQuery.error ||
    offersQuery.error ||
    threadsQuery.error;

  const applications = useMemo<Application[]>(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data]
  );
  const jobs = useMemo<Job[]>(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const interviews = useMemo<InterviewWithSlots[]>(
    () => (interviewsQuery.data ?? []) as InterviewWithSlots[],
    [interviewsQuery.data]
  );
  const offers = useMemo<Offer[]>(() => offersQuery.data ?? [], [offersQuery.data]);
  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);

  const derived = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const todayStart = startOfDayJst(now);
    const todayEnd = endOfDayJst(now);
    const weekStart = startOfIsoWeek(now);
    const weekEnd = endOfIsoWeek(now);
    const monthStart = startOfMonth(now);
    const threeDaysAhead = nowMs + 3 * 24 * 60 * 60 * 1000;
    const sevenDaysAhead = nowMs + 7 * 24 * 60 * 60 * 1000;

    const isActiveApp = (a: Application) => a.status === ApplicationStatus.Active;

    const offersByAppId = new Map<string, Offer>();
    for (const o of offers) {
      offersByAppId.set(o.application_id, o);
    }

    let offersExpiring = 0;
    for (const app of applications) {
      if (app.status !== ApplicationStatus.Offered) continue;
      const offer = offersByAppId.get(app.id);
      if (!offer?.expires_at) continue;
      const expires = new Date(offer.expires_at).getTime();
      if (expires <= threeDaysAhead) offersExpiring++;
    }

    let stepsOverdue = 0;
    let stepsDueToday = 0;
    for (const app of applications) {
      if (!isActiveApp(app)) continue;
      for (const step of app.application_steps ?? []) {
        if (step.status !== StepStatus.Pending && step.status !== StepStatus.InProgress) continue;
        if (!step.deadline_at) continue;
        const deadline = new Date(step.deadline_at).getTime();
        if (deadline < nowMs) {
          stepsOverdue++;
        } else if (deadline >= todayStart && deadline <= todayEnd) {
          stepsDueToday++;
        }
      }
    }

    let interviewsScheduling = 0;
    for (const iv of interviews) {
      if (iv.status !== "scheduling") continue;
      const slots = iv.interview_slots ?? [];
      if (slots.length === 0) continue;
      const hasSelected = slots.some((s) => s.is_selected);
      if (!hasSelected) interviewsScheduling++;
    }

    let unreadApplicantMessages = 0;
    for (const t of threads) {
      if (t.is_channel) continue;
      if (t.participant_type !== "applicant") continue;
      unreadApplicantMessages += t.unread_count ?? 0;
    }

    const alerts: AlertCounts = {
      offersExpiring,
      stepsOverdue,
      stepsDueToday,
      interviewsScheduling,
      unreadApplicantMessages,
    };

    const openJobs = jobs.filter((j) => j.status === "open").length;
    const activeApplications = applications.filter(isActiveApp).length;
    const offered = applications.filter((a) => a.status === ApplicationStatus.Offered).length;
    const appliedThisMonth = applications.filter(
      (a) => new Date(a.applied_at).getTime() >= monthStart
    ).length;

    let interviewsThisWeek = 0;
    for (const iv of interviews) {
      if (iv.status === "cancelled" || iv.status === "completed") continue;
      for (const slot of iv.interview_slots ?? []) {
        if (!slot.is_selected) continue;
        const t = new Date(slot.start_at).getTime();
        if (t >= weekStart && t <= weekEnd) {
          interviewsThisWeek++;
          break;
        }
      }
    }

    const kpis: KpiCounts = {
      openJobs,
      activeApplications,
      interviewsThisWeek,
      offered,
      appliedThisMonth,
    };

    const appById = new Map(applications.map((a) => [a.id, a]));
    const upcoming: UpcomingInterviewEntry[] = [];
    for (const iv of interviews) {
      if (iv.status === "cancelled" || iv.status === "completed") continue;
      for (const slot of iv.interview_slots ?? []) {
        if (!slot.is_selected) continue;
        const t = new Date(slot.start_at).getTime();
        if (t < nowMs || t > sevenDaysAhead) continue;
        const app = slot.application_id ? appById.get(slot.application_id) : null;
        upcoming.push({
          interviewId: iv.id,
          slotId: slot.id,
          startAt: slot.start_at,
          endAt: slot.end_at,
          title: iv.title,
          location: iv.location,
          applicantName: app?.profiles?.display_name ?? null,
          applicantEmail: app?.profiles?.email ?? null,
          applicationId: slot.application_id ?? null,
          jobTitle: app?.jobs?.title ?? null,
        });
      }
    }
    upcoming.sort((a, b) => a.startAt.localeCompare(b.startAt));

    return { alerts, kpis, upcoming };
  }, [applications, jobs, interviews, offers, threads]);

  return {
    isLoading,
    error,
    alerts: derived.alerts,
    kpis: derived.kpis,
    upcomingInterviews: derived.upcoming,
  };
}
