"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { getSupabase } from "@/lib/supabase/browser";
import * as schedulingRepo from "@/lib/repositories/scheduling-repository";
import { useAuth } from "@/lib/auth-context";
import { autoFillEndAt } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import type { Interview, InterviewSlot } from "@/types/database";

export async function loadSchedulingDetail(id: string, organizationId: string) {
  const client = getSupabase();
  return schedulingRepo.fetchDetail(client, id, organizationId);
}

export async function updateInterviewStatus(id: string, organizationId: string, status: string) {
  return schedulingRepo.updateInterviewStatus(getSupabase(), id, organizationId, status);
}

export async function saveSchedulingDetail(params: {
  interviewId: string;
  organizationId: string;
  userId: string;
  title: string;
  location: string | null;
  notes: string | null;
  existingSlots: {
    id: string;
    start_at: string;
    end_at: string;
    max_applicants: number | null;
    application_id: string | null;
  }[];
  editSlots: {
    id: string;
    startAt: string;
    endAt: string;
    maxApplicants: number;
    isNew?: boolean;
    applicationId?: string | null;
  }[];
  toLocalDatetime: (iso: string) => string;
}) {
  const client = getSupabase();
  const slotLogs: { detail_action: string; summary: string }[] = [];

  await schedulingRepo.updateInterview(client, params.interviewId, params.organizationId, {
    title: params.title,
    location: params.location,
    notes: params.notes,
  });

  const existingIds = params.existingSlots.map((s) => s.id);
  const editIds = params.editSlots.filter((s) => !s.isNew).map((s) => s.id);

  const deletedIds = existingIds.filter((sid) => !editIds.includes(sid));
  const deletableIds = deletedIds.filter((sid) => {
    const slot = params.existingSlots.find((s) => s.id === sid);
    return !slot?.application_id;
  });
  if (deletableIds.length > 0) {
    await schedulingRepo.deleteSlots(client, deletableIds);
    slotLogs.push({
      detail_action: "slot_deleted",
      summary: `候補日時を${deletableIds.length}件削除`,
    });
  }

  const newSlots = params.editSlots.filter((s) => s.isNew && s.startAt && s.endAt);
  if (newSlots.length > 0) {
    await schedulingRepo.createSlots(
      client,
      newSlots.map((s, i) => ({
        id: `slot-${params.interviewId}-${Date.now()}-${i}`,
        interview_id: params.interviewId,
        start_at: new Date(s.startAt).toISOString(),
        end_at: new Date(s.endAt).toISOString(),
        is_selected: false,
        max_applicants: s.maxApplicants,
      }))
    );
    slotLogs.push({ detail_action: "slot_added", summary: `候補日時を${newSlots.length}件追加` });
  }

  let updatedCount = 0;
  for (const es of params.editSlots.filter((s) => !s.isNew)) {
    const original = params.existingSlots.find((s) => s.id === es.id);
    if (!original) continue;
    const origStart = params.toLocalDatetime(original.start_at);
    const origEnd = params.toLocalDatetime(original.end_at);
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
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    slotLogs.push({ detail_action: "slot_updated", summary: `候補日時を${updatedCount}件変更` });
  }

  if (slotLogs.length > 0) {
    await schedulingRepo.insertAuditLogs(
      client,
      slotLogs.map((log) => ({
        organization_id: params.organizationId,
        user_id: params.userId,
        action: log.detail_action.includes("deleted")
          ? "delete"
          : log.detail_action.includes("added")
            ? "create"
            : "update",
        table_name: "interviews",
        record_id: params.interviewId,
        metadata: { summary: log.summary, detail_action: log.detail_action },
        source: "console" as const,
      }))
    );
  }
}

// datetime-local用のフォーマット (yyyy-MM-ddTHH:mm)
function toLocalDatetime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export function useSchedulingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const { user } = useAuth();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [bookedApps, setBookedApps] = useState<BookedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("detail");

  const [historySearch, setHistorySearch] = useState("");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("info");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSlots, setEditSlots] = useState<EditSlot[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const { data } = await loadSchedulingDetail(id, organization.id);

    if (data) {
      const { interview_slots, ...rest } = data;
      setInterview(rest as Interview);
      const sortedSlots = (interview_slots ?? []).sort(
        (a: InterviewSlot, b: InterviewSlot) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
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
      const oldStatus = interview?.status;
      await updateInterviewStatus(id, organization.id, status);
      setInterview((prev) => (prev ? { ...prev, status: status as Interview["status"] } : prev));

      if (oldStatus && oldStatus !== status) {
        setAuditRefreshKey((k) => k + 1);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  const startEditing = () => {
    if (!interview) return;
    setEditTitle(interview.title);
    setEditLocation(interview.location ?? "");
    setEditNotes(interview.notes ?? "");
    setEditSlots(
      slots.map((s) => ({
        id: s.id,
        startAt: toLocalDatetime(s.start_at),
        endAt: toLocalDatetime(s.end_at),
        maxApplicants: Math.max(1, s.max_applicants ?? 1),
        applicationId: s.application_id,
      }))
    );
    setEditTab("info");
    setEditing(true);
  };

  const addSlot = () => {
    setEditSlots([
      ...editSlots,
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
    setEditSlots(editSlots.filter((s) => s.id !== slotId));
  };

  const updateSlot = (
    slotId: string,
    field: "startAt" | "endAt" | "maxApplicants",
    value: string | number
  ) => {
    setEditSlots(
      editSlots.map((s) => {
        if (s.id !== slotId) return s;
        const updated = { ...s, [field]: value };
        if (field === "startAt" && value && !s.endAt) {
          updated.endAt = autoFillEndAt(value as string);
        }
        return updated;
      })
    );
  };

  const handleSave = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!interview || !organization)
      return { success: false, error: "No interview or organization" };
    try {
      setSaving(true);

      await saveSchedulingDetail({
        interviewId: interview.id,
        organizationId: organization.id,
        userId: user!.id,
        title: editTitle,
        location: editLocation || null,
        notes: editNotes || null,
        existingSlots: slots,
        editSlots,
        toLocalDatetime,
      });

      setSaving(false);
      setEditing(false);
      await load();
      setAuditRefreshKey((k) => k + 1);
      return { success: true };
    } catch (e) {
      setSaving(false);
      return { success: false, error: (e as Error).message };
    }
  };

  return {
    interview,
    slots,
    auditRefreshKey,
    bookedApps,
    loading,
    activeTab,
    setActiveTab,
    historySearch,
    setHistorySearch,
    editing,
    setEditing,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editLocation,
    setEditLocation,
    editNotes,
    setEditNotes,
    editSlots,
    saving,
    updateStatus,
    startEditing,
    addSlot,
    removeSlot,
    updateSlot,
    handleSave,
  };
}
