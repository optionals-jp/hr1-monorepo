"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/scheduling-repository";

export function useSchedulingList() {
  return useOrgQuery("interviews", (orgId) => repository.findByOrg(getSupabase(), orgId));
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
