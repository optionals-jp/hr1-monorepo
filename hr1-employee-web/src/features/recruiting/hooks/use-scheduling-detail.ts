"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@hr1/shared-ui";
import { getSupabase } from "@/lib/supabase/browser";
import * as schedulingRepo from "@/lib/repositories/scheduling-repository";
import { autoFillEndAt, toLocalDatetime } from "@/lib/datetime-utils";
import { useOrg } from "@/lib/org-context";
import type { Interview, InterviewSlot, Profile } from "@/types/database";

export interface BookedApplication {
  slotId: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  startAt: string;
  endAt: string;
}

export interface EditSlot {
  id: string;
  startAt: string;
  endAt: string;
  maxApplicants: number;
  isNew?: boolean;
  applicationId?: string | null;
}

export type SchedulingDetailTab = "detail" | "timeline";

export function useSchedulingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [bookedApps, setBookedApps] = useState<BookedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam<SchedulingDetailTab>("detail");

  const [interviewers, setInterviewers] = useState<Profile[]>([]);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingSlots, setEditingSlots] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editInterviewerIds, setEditInterviewerIds] = useState<string[]>([]);
  const [editSlots, setEditSlots] = useState<EditSlot[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const client = getSupabase();
    const { data } = await schedulingRepo.fetchDetail(client, id, organization.id);

    if (data) {
      const { interview_slots, ...rest } = data as Interview & {
        interview_slots?: InterviewSlot[];
      };
      setInterview(rest as Interview);
      const sortedSlots = (interview_slots ?? []).sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      setSlots(sortedSlots);

      const apps: BookedApplication[] = [];
      for (const slot of sortedSlots) {
        if (slot.application_id) {
          const app = slot.applications as unknown as {
            id: string;
            profiles?: { display_name: string | null; email: string };
          } | null;
          apps.push({
            slotId: slot.id,
            applicationId: slot.application_id,
            applicantName: app?.profiles?.display_name ?? "-",
            applicantEmail: app?.profiles?.email ?? "-",
            startAt: slot.start_at,
            endAt: slot.end_at,
          });
        }
      }
      setBookedApps(apps);

      // 面接官プロフィールを取得
      const interviewerIds = (rest as Interview).interviewer_ids ?? [];
      if (interviewerIds.length > 0) {
        const profiles = await schedulingRepo.fetchInterviewerProfiles(client, interviewerIds);
        setInterviewers(profiles as Profile[]);
      } else {
        setInterviewers([]);
      }
    }
    setLoading(false);
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
    void load();
  }, [load, organization]);

  const updateStatus = async (status: string): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "No organization" };
    try {
      await schedulingRepo.updateInterviewStatus(getSupabase(), id, organization.id, status);
      setInterview((prev) => (prev ? { ...prev, status: status as Interview["status"] } : prev));
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  const startEditingInfo = () => {
    if (!interview) return;
    setEditTitle(interview.title);
    setEditLocation(interview.location ?? "");
    setEditNotes(interview.notes ?? "");
    setEditInterviewerIds(interview.interviewer_ids ?? []);
    setEditingInfo(true);
  };

  const startEditingSlots = () => {
    if (!interview) return;
    setEditSlots(
      slots.map((s) => ({
        id: s.id,
        startAt: toLocalDatetime(s.start_at),
        endAt: toLocalDatetime(s.end_at),
        maxApplicants: Math.max(1, s.max_applicants ?? 1),
        applicationId: s.application_id,
      }))
    );
    setEditingSlots(true);
  };

  const addSlot = () => {
    setEditSlots((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        startAt: "",
        endAt: "",
        maxApplicants: 1,
        isNew: true,
      },
    ]);
  };

  const removeSlot = (slotId: string) => {
    setEditSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const updateSlot = (
    slotId: string,
    field: "startAt" | "endAt" | "maxApplicants",
    value: string | number
  ) => {
    setEditSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const updated = { ...s, [field]: value };
        if (field === "startAt" && value && !s.endAt) {
          updated.endAt = autoFillEndAt(value as string);
        }
        return updated;
      })
    );
  };

  const handleSaveInfo = async (): Promise<{ success: boolean; error?: string }> => {
    if (!interview || !organization) {
      return { success: false, error: "No interview or organization" };
    }
    try {
      setSaving(true);
      await schedulingRepo.updateInterview(getSupabase(), interview.id, organization.id, {
        title: editTitle,
        location: editLocation || null,
        notes: editNotes || null,
        interviewer_ids: editInterviewerIds.length > 0 ? editInterviewerIds : undefined,
      });
      setSaving(false);
      setEditingInfo(false);
      await load();
      return { success: true };
    } catch (e) {
      setSaving(false);
      return { success: false, error: (e as Error).message };
    }
  };

  const handleSaveSlots = async (): Promise<{ success: boolean; error?: string }> => {
    if (!interview || !organization) {
      return { success: false, error: "No interview or organization" };
    }
    try {
      setSaving(true);
      const client = getSupabase();

      const existingIds = slots.map((s) => s.id);
      const editIds = editSlots.filter((s) => !s.isNew).map((s) => s.id);

      const deletedIds = existingIds.filter((sid) => !editIds.includes(sid));
      const deletableIds = deletedIds.filter((sid) => {
        const slot = slots.find((s) => s.id === sid);
        return !slot?.application_id;
      });
      if (deletableIds.length > 0) {
        await schedulingRepo.deleteSlots(client, deletableIds);
      }

      const newSlots = editSlots.filter((s) => s.isNew && s.startAt && s.endAt);
      if (newSlots.length > 0) {
        await schedulingRepo.createSlots(
          client,
          newSlots.map((s) => ({
            interview_id: interview.id,
            start_at: new Date(s.startAt).toISOString(),
            end_at: new Date(s.endAt).toISOString(),
            is_selected: false,
            max_applicants: s.maxApplicants,
          }))
        );
      }

      for (const es of editSlots.filter((s) => !s.isNew)) {
        const original = slots.find((s) => s.id === es.id);
        if (!original) continue;
        const origStart = toLocalDatetime(original.start_at);
        const origEnd = toLocalDatetime(original.end_at);
        const timeChanged =
          !original.application_id && (es.startAt !== origStart || es.endAt !== origEnd);
        const maxChanged = es.maxApplicants !== (original.max_applicants ?? 0);
        if (timeChanged || maxChanged) {
          const updates: Record<string, unknown> = { max_applicants: es.maxApplicants };
          if (timeChanged) {
            updates.start_at = new Date(es.startAt).toISOString();
            updates.end_at = new Date(es.endAt).toISOString();
          }
          await schedulingRepo.updateSlot(client, es.id, updates);
        }
      }

      setSaving(false);
      setEditingSlots(false);
      await load();
      return { success: true };
    } catch (e) {
      setSaving(false);
      return { success: false, error: (e as Error).message };
    }
  };

  return {
    interview,
    slots,
    bookedApps,
    interviewers,
    loading,
    activeTab,
    setActiveTab,
    editingInfo,
    setEditingInfo,
    editingSlots,
    setEditingSlots,
    editTitle,
    setEditTitle,
    editLocation,
    setEditLocation,
    editNotes,
    setEditNotes,
    editInterviewerIds,
    setEditInterviewerIds,
    editSlots,
    saving,
    updateStatus,
    startEditingInfo,
    startEditingSlots,
    addSlot,
    removeSlot,
    updateSlot,
    handleSaveInfo,
    handleSaveSlots,
  };
}
