"use client";

import type { CalendarEvent } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/calendar-repository";

export interface InterviewCalendarEvent extends CalendarEvent {
  interviewId: string;
  applicationId: string | null;
}

export function useCalendarEvents(currentMonth: Date, rangeStart: Date, rangeEnd: Date) {
  const { organization } = useOrg();

  return useQuery<InterviewCalendarEvent[]>(
    organization ? `calendar-${organization.id}-${currentMonth.toISOString()}` : null,
    async () => {
      const slotsData = await repository.fetchInterviewSlots(
        getSupabase(),
        organization!.id,
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      );

      return slotsData.map((slot: Record<string, unknown>) => {
        const interview = slot.interviews as Record<string, unknown>;
        const app = slot.applications as Record<string, unknown> | null;
        const profile = app?.profiles as Record<string, unknown> | null;
        const job = app?.jobs as Record<string, unknown> | null;
        const startAt = slot.start_at as string;
        const endAt = slot.end_at as string;

        return {
          id: slot.id as string,
          type: "interview" as const,
          title: (interview?.title as string) ?? "面接",
          startAt,
          endAt,
          durationMin: Math.round(
            (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000
          ),
          applicantName: (profile?.display_name as string | null) ?? null,
          applicantEmail: (profile?.email as string | null) ?? null,
          jobTitle: (job?.title as string | null) ?? null,
          location: (interview?.location as string | null) ?? null,
          interviewId: interview?.id as string,
          applicationId: (slot.application_id as string | null) ?? null,
          status: slot.application_id ? "booked" : "available",
        } satisfies InterviewCalendarEvent;
      });
    }
  );
}

export type { CalendarEvent };
