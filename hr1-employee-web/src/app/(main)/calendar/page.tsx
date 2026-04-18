"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { MonthCalendar, calendarRangeForMonth } from "@hr1/shared-ui";
import { useCalendarEvents } from "@/lib/hooks/use-calendar";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => calendarRangeForMonth(currentMonth),
    [currentMonth]
  );

  const {
    data: events = [],
    error,
    mutate,
  } = useCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString());

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--header-height))]">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader
        title="カレンダー"
        description="スケジュールの確認"
        sticky={false}
        border={false}
      />
      <div className="flex-1 min-h-0 px-4 pb-4 sm:px-6 md:px-8 md:pb-6">
        <MonthCalendar
          events={events}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      </div>
    </div>
  );
}
