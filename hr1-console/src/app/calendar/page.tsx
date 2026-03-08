"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface CalendarEvent {
  id: string;
  type: "interview";
  title: string;
  startAt: Date;
  endAt: Date;
  durationMin: number;
  applicantName: string | null;
  applicantEmail: string | null;
  jobTitle: string | null;
  location: string | null;
  interviewId: string;
  applicationId: string | null;
  status: string;
}

// ---------- Helpers ----------

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** 月曜始まりで 0=月 ... 6=日 */
function dayOfWeekMon(d: Date) {
  return (d.getDay() + 6) % 7;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatMonth(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// ---------- Component ----------

export default function CalendarPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch range: full month ± 1 week for calendar grid padding
  const rangeStart = useMemo(() => {
    const s = startOfMonth(currentMonth);
    s.setDate(s.getDate() - dayOfWeekMon(s));
    return s;
  }, [currentMonth]);

  const rangeEnd = useMemo(() => {
    const e = endOfMonth(currentMonth);
    e.setDate(e.getDate() + (6 - dayOfWeekMon(e)));
    e.setHours(23, 59, 59);
    return e;
  }, [currentMonth]);

  const { data: events = [] } = useQuery<CalendarEvent[]>(
    organization
      ? `calendar-${organization.id}-${currentMonth.toISOString()}`
      : null,
    async () => {
      // Fetch interview slots within range with applicant + job details
      const { data: slotsData } = await supabase
        .from("interview_slots")
        .select(
          `*,
           interviews!inner(id, title, organization_id, status, location, notes),
           applications:application_id(
             id,
             job_id,
             profiles:applicant_id(display_name, email),
             jobs:job_id(title)
           )`
        )
        .eq("interviews.organization_id", organization!.id)
        .gte("start_at", rangeStart.toISOString())
        .lte("start_at", rangeEnd.toISOString())
        .order("start_at");

      if (!slotsData) return [];

      return slotsData.map((slot: Record<string, unknown>) => {
        const interview = slot.interviews as Record<string, unknown>;
        const app = slot.applications as Record<string, unknown> | null;
        const profile = app?.profiles as Record<string, unknown> | null;
        const job = app?.jobs as Record<string, unknown> | null;
        const startAt = new Date(slot.start_at as string);
        const endAt = new Date(slot.end_at as string);

        return {
          id: slot.id as string,
          type: "interview" as const,
          title: (interview?.title as string) ?? "面接",
          startAt,
          endAt,
          durationMin: Math.round(
            (endAt.getTime() - startAt.getTime()) / 60000
          ),
          applicantName: (profile?.display_name as string | null) ?? null,
          applicantEmail: (profile?.email as string | null) ?? null,
          jobTitle: (job?.title as string | null) ?? null,
          location: (interview?.location as string | null) ?? null,
          interviewId: interview?.id as string,
          applicationId: (slot.application_id as string | null) ?? null,
          status: slot.application_id ? "booked" : "available",
        };
      });
    }
  );

  // Build calendar grid (6 weeks max)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [rangeStart, rangeEnd]);

  const eventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(e.startAt, date));

  const today = new Date();

  const prevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  const goToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
    setSelectedDate(new Date());
  };

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-(--spacing(14)))]">
      <PageHeader title="カレンダー" description="面接日程を一覧表示" />

      <div className="flex flex-col flex-1 min-h-0 px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold min-w-32 text-center">
              {formatMonth(currentMonth)}
            </h2>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>
            今日
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row flex-1 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0 flex flex-col border rounded-lg overflow-hidden bg-white">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-xs font-medium py-2 bg-slate-50",
                  i < 6 && "border-r",
                  i === 5
                    ? "text-blue-500"
                    : i === 6
                      ? "text-red-500"
                      : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
            {weeks.flat().map((date) => {
              const isCurrentMonth =
                date.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const dayEvents = eventsForDate(date);
              const dayOfWeek = dayOfWeekMon(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "relative p-1 transition-colors overflow-hidden flex flex-col items-center",
                    dayOfWeek < 6 && "border-r",
                    "border-b",
                    "hover:bg-accent/50",
                    isSelected && "bg-accent",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm",
                      isToday && "bg-primary text-primary-foreground font-bold",
                      !isCurrentMonth && "text-muted-foreground/50",
                      dayOfWeek === 5 && isCurrentMonth && !isToday && "text-blue-500",
                      dayOfWeek === 6 && isCurrentMonth && !isToday && "text-red-500"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Event dots / previews */}
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 space-y-0.5 w-full text-left">
                      {/* Mobile: dots only */}
                      <div className="flex gap-0.5 sm:hidden">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              ev.status === "booked"
                                ? "bg-primary"
                                : "bg-muted-foreground/40"
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted-foreground leading-none">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                      {/* Desktop: mini labels */}
                      <div className="hidden sm:block space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                              ev.status === "booked"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {formatTime(ev.startAt)}{" "}
                            {ev.applicantName ?? ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 2}件
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected date detail panel */}
        <div className="w-full lg:w-80 shrink-0 lg:overflow-y-auto">
          <Card className="h-full border rounded-lg bg-white">
            <CardContent className="p-4">
              {selectedDate ? (
                <>
                  <h3 className="font-medium mb-3">
                    {selectedDate.getFullYear()}/
                    {String(selectedDate.getMonth() + 1).padStart(2, "0")}/
                    {String(selectedDate.getDate()).padStart(2, "0")}
                    （{WEEKDAYS[dayOfWeekMon(selectedDate)]}）
                  </h3>

                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      予定はありません
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedEvents
                        .sort(
                          (a, b) => a.startAt.getTime() - b.startAt.getTime()
                        )
                        .map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() =>
                              ev.applicationId
                                ? router.push(`/applications/${ev.applicationId}`)
                                : router.push(`/scheduling/${ev.interviewId}`)
                            }
                            className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">
                                {ev.title}
                              </p>
                              <Badge
                                variant={
                                  ev.status === "booked"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-[10px] shrink-0"
                              >
                                {ev.status === "booked" ? "予約済" : "空き"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(ev.startAt)} 〜{" "}
                              {formatTime(ev.endAt)}（{ev.durationMin}分）
                            </p>
                            {ev.applicantName && (
                              <p className="text-sm mt-1.5">
                                {ev.applicantName}
                              </p>
                            )}
                            {ev.applicantEmail && (
                              <p className="text-xs text-muted-foreground">
                                {ev.applicantEmail}
                              </p>
                            )}
                            {ev.jobTitle && (
                              <p className="text-xs text-muted-foreground mt-1">
                                求人: {ev.jobTitle}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-xs text-muted-foreground">
                                場所: {ev.location}
                              </p>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  日付を選択してください
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
