"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as schedulingRepo from "@/lib/repositories/scheduling-repository";

export async function loadSchedulingDetail(id: string, organizationId: string) {
  const client = getSupabase();
  return schedulingRepo.fetchDetail(client, id, organizationId);
}

export async function updateInterviewStatus(id: string, organizationId: string, status: string) {
  return schedulingRepo.updateInterviewStatus(getSupabase(), id, organizationId, status);
}

export async function fetchSchedulingAuditLogs(organizationId: string, interviewId: string) {
  return schedulingRepo.fetchAuditLogs(getSupabase(), organizationId, interviewId);
}

export async function saveSchedulingDetail(params: {
  interviewId: string;
  organizationId: string;
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
    const userId = (await client.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("認証ユーザーが取得できません");
    await schedulingRepo.insertAuditLogs(
      client,
      slotLogs.map((log) => ({
        organization_id: params.organizationId,
        user_id: userId,
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
