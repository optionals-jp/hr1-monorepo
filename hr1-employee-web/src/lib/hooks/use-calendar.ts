"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as calendarRepository from "@/lib/repositories/calendar-repository";
import type { CalendarEvent, CalendarEventLink } from "@hr1/shared-ui";
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
        applicant_id: string | null;
        profiles: { display_name: string | null; email: string } | null;
        jobs: { title: string } | null;
      } | null;
      const startAt = slot.start_at as string;
      const endAt = slot.end_at as string;

      const links: CalendarEventLink[] = [];
      if (interview?.id) {
        links.push({ label: "面接予定を開く", href: `/scheduling/${interview.id}` });
      }
      if (app?.id) {
        links.push({ label: "応募情報を開く", href: `/applications/${app.id}` });
      }
      if (app?.applicant_id) {
        links.push({ label: "応募者詳細を開く", href: `/applicants/${app.applicant_id}` });
      }

      return {
        id: slot.id as string,
        type: "interview",
        title: interview?.title ?? "面接",
        startAt,
        endAt,
        durationMin: differenceInMinutes(new Date(endAt), new Date(startAt)),
        applicantName: app?.profiles?.display_name ?? null,
        applicantEmail: app?.profiles?.email ?? null,
        jobTitle: app?.jobs?.title ?? null,
        location: interview?.location ?? null,
        status: slot.is_selected ? "booked" : "available",
        links,
      } satisfies CalendarEvent;
    });
  });
}
