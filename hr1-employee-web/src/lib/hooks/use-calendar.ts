"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as calendarRepository from "@/lib/repositories/calendar-repository";
import type { CalendarEvent } from "@/types/database";
import { differenceInMinutes } from "date-fns";

export function useCalendarEvents(rangeStart: string, rangeEnd: string) {
  return useOrgQuery<CalendarEvent[]>(`calendar-${rangeStart}-${rangeEnd}`, async (orgId) => {
    const slots = await calendarRepository.fetchInterviewSlots(
      getSupabase(),
      orgId,
      rangeStart,
      rangeEnd
    );

    return slots.map((slot) => {
      const interview = slot.interviews as {
        id: string;
        title: string;
        location: string;
        status: string;
      } | null;
      const app = slot.applications as {
        id: string;
        profiles: { display_name: string | null; email: string } | null;
        jobs: { title: string } | null;
      } | null;

      return {
        id: slot.id as string,
        type: "interview",
        title: interview?.title ?? "面接",
        startAt: slot.start_at as string,
        endAt: slot.end_at as string,
        durationMin: differenceInMinutes(
          new Date(slot.end_at as string),
          new Date(slot.start_at as string)
        ),
        applicantName: app?.profiles?.display_name ?? undefined,
        applicantEmail: app?.profiles?.email ?? undefined,
        jobTitle: app?.jobs?.title ?? undefined,
        location: interview?.location ?? undefined,
        status: slot.is_selected ? "予約済" : "空き",
      } satisfies CalendarEvent;
    });
  });
}
