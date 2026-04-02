"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useCreateMessageThread } from "@/lib/hooks/use-create-message-thread";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Profile, Application, ApplicationStep } from "@/types/database";
import {
  applicationStatusLabels as statusLabels,
  stepStatusLabels,
  interviewStatusLabels,
  StepStatus,
  StepType,
} from "@/lib/constants";

interface TimelineEvent {
  id: string;
  category: string;
  source: string;
  eventType: string;
  label: string;
  status: string;
  date: string;
  actor?: string;
}

export function useApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("profile");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    if (!organization) return;
    async function load() {
      setLoading(true);
      const client = getSupabase();
      const appsData = await applicantRepo.fetchApplicantApplications(client, id, organization!.id);

      if (appsData.length === 0) {
        setProfile(null);
        setApplications([]);
        setLoading(false);
        return;
      }

      const profileData = await applicantRepo.fetchProfile(client, id);
      setProfile(profileData);
      setApplications(appsData);

      const events: TimelineEvent[] = [];

      const applicantName = profileData?.display_name ?? profileData?.email ?? "応募者";

      if (profileData) {
        events.push({
          id: `profile-${profileData.id}`,
          category: "アカウント",
          source: "-",
          eventType: "アカウント作成",
          label: "作成",
          status: StepStatus.Completed,
          date: profileData.created_at,
          actor: applicantName,
        });
      }

      const formStepIds: { stepId: string; relatedId: string; jobTitle: string; date: string }[] =
        [];
      const interviewStepIds: {
        stepId: string;
        relatedId: string;
        jobTitle: string;
        date: string;
      }[] = [];

      for (const app of appsData ?? []) {
        const jobTitle = app.jobs?.title ?? "-";

        events.push({
          id: `app-${app.id}`,
          category: "応募",
          source: jobTitle,
          eventType: "応募",
          label: statusLabels[app.status] ?? app.status,
          status: app.status,
          date: app.applied_at,
          actor: applicantName,
        });

        for (const step of (app.application_steps ?? []) as ApplicationStep[]) {
          if (step.status !== StepStatus.Pending) {
            events.push({
              id: `step-${step.id}`,
              category: "選考",
              source: jobTitle,
              eventType: step.label,
              label: stepStatusLabels[step.status] ?? step.status,
              status: step.status,
              date: step.completed_at ?? app.applied_at,
              actor: "システム",
            });
          }

          if (step.related_id && step.step_type === StepType.Form) {
            formStepIds.push({
              stepId: step.id,
              relatedId: step.related_id,
              jobTitle,
              date: step.completed_at ?? app.applied_at,
            });
          }
          if (step.related_id && step.step_type === StepType.Interview) {
            interviewStepIds.push({
              stepId: step.id,
              relatedId: step.related_id,
              jobTitle,
              date: step.completed_at ?? app.applied_at,
            });
          }
        }
      }

      if (formStepIds.length > 0) {
        const formIds = [...new Set(formStepIds.map((f) => f.relatedId))];
        const formMap = await applicantRepo.fetchLinkedForms(client, formIds);

        for (const fs of formStepIds) {
          const formTitle = formMap.get(fs.relatedId);
          if (formTitle) {
            events.push({
              id: `form-${fs.stepId}`,
              category: "フォーム",
              source: fs.jobTitle,
              eventType: `フォーム: ${formTitle}`,
              label: "送信済み",
              status: StepStatus.Completed,
              date: fs.date,
              actor: applicantName,
            });
          }
        }
      }

      if (interviewStepIds.length > 0) {
        const intIds = [...new Set(interviewStepIds.map((i) => i.relatedId))];
        const intMap = await applicantRepo.fetchLinkedInterviews(client, intIds);

        for (const is_ of interviewStepIds) {
          const interview = intMap.get(is_.relatedId);
          if (interview) {
            events.push({
              id: `interview-${is_.stepId}`,
              category: "面接",
              source: is_.jobTitle,
              eventType: `面接: ${interview.title}`,
              label: interviewStatusLabels[interview.status] ?? interview.status,
              status: interview.status,
              date: is_.date,
              actor: "システム",
            });
          }
        }
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimelineEvents(events);

      setLoading(false);
    }
    load();
  }, [id, organization]);

  const { handleOpenMessage, creatingThread } = useCreateMessageThread({
    participantId: profile?.id,
    participantType: "applicant",
    organizationId: organization?.id,
  });

  const filteredTimeline = useMemo(() => {
    return timelineEvents.filter((ev) => {
      if (statusFilter && ev.label !== statusFilter) return false;
      if (eventFilter && ev.category !== eventFilter) return false;
      if (!historySearch) return true;
      const q = historySearch.toLowerCase();
      return ev.source.toLowerCase().includes(q) || ev.eventType.toLowerCase().includes(q);
    });
  }, [timelineEvents, statusFilter, eventFilter, historySearch]);

  return {
    id,
    organization,
    profile,
    applications,
    timelineEvents,
    filteredTimeline,
    loading,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    eventFilter,
    setEventFilter,
    historySearch,
    setHistorySearch,
    handleOpenMessage,
    creatingThread,
  };
}

export type { TimelineEvent };
