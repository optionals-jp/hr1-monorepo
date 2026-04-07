"use client";

import { useState, useCallback } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { autoFillEndAt } from "@/lib/utils";
import * as repository from "@/lib/repositories/scheduling-repository";

export function useSchedulingList() {
  return useOrgQuery("interviews", (orgId) => repository.findByOrg(getSupabase(), orgId));
}

export function useCreateInterview() {
  const { organization } = useOrg();
  const { mutate } = useSchedulingList();

  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [slots, setSlots] = useState<{ startAt: string; endAt: string; maxApplicants: number }[]>(
    []
  );

  const addSlot = useCallback(() => {
    setSlots((prev) => [...prev, { startAt: "", endAt: "", maxApplicants: 1 }]);
  }, []);

  const updateSlot = useCallback(
    (index: number, field: "startAt" | "endAt" | "maxApplicants", value: string | number) => {
      setSlots((prev) => {
        const updated = [...prev];
        if (field === "maxApplicants") {
          updated[index] = { ...updated[index], maxApplicants: value as number };
        } else {
          updated[index] = { ...updated[index], [field]: value as string };
        }
        if (field === "startAt" && value && !updated[index].endAt) {
          updated[index] = { ...updated[index], endAt: autoFillEndAt(value as string) };
        }
        return updated;
      });
    },
    []
  );

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!organization || !newTitle) return;
    setSaving(true);

    try {
      await createInterview({
        organizationId: organization.id,
        title: newTitle,
        location: newLocation,
        notes: newNotes,
        slots,
      });

      setNewTitle("");
      setNewLocation("");
      setNewNotes("");
      setSlots([]);
      mutate();
    } finally {
      setSaving(false);
    }
  }, [organization, newTitle, newLocation, newNotes, slots, mutate]);

  return {
    newTitle,
    setNewTitle,
    newLocation,
    setNewLocation,
    newNotes,
    setNewNotes,
    slots,
    addSlot,
    updateSlot,
    removeSlot,
    saving,
    handleCreate,
  };
}

export async function createInterview(params: {
  organizationId: string;
  title: string;
  location: string;
  notes: string;
  slots: { startAt: string; endAt: string; maxApplicants: number }[];
}): Promise<{ success: boolean }> {
  const client = getSupabase();
  const interviewId = `interview-${Date.now()}`;

  await repository.createInterview(client, {
    id: interviewId,
    organization_id: params.organizationId,
    title: params.title,
    location: params.location || null,
    notes: params.notes || null,
    status: "scheduling",
  });

  const validSlots = params.slots.filter((s) => s.startAt && s.endAt);
  if (validSlots.length > 0) {
    await repository.createSlots(
      client,
      validSlots.map((slot, i) => ({
        id: `slot-${interviewId}-${i + 1}`,
        interview_id: interviewId,
        start_at: new Date(slot.startAt).toISOString(),
        end_at: new Date(slot.endAt).toISOString(),
        is_selected: false,
        max_applicants: slot.maxApplicants,
      }))
    );
  }

  return { success: true };
}
