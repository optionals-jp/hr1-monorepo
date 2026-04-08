"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Popover, PopoverContent, PopoverTrigger } from "@hr1/shared-ui/components/ui/popover";
import { useCalendarEvents, type CalendarEvent } from "@/lib/hooks/use-calendar";
import { ChevronLeft, ChevronRight, MapPin, Briefcase, Clock, User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

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

// ---------- Event Popover ----------

function EventPopover({ event, children }: { event: CalendarEvent; children: React.ReactNode }) {
  const router = useRouter();

  const handleNavigate = () => {
    if (event.applicationId) {
      router.push(`/applications/${event.applicationId}`);
    } else {
      router.push(`/scheduling/${event.interviewId}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="w-full text-left" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="right" sideOffset={8}>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm leading-snug">{event.title}</h3>
            <Badge
              variant={event.status === "booked" ? "default" : "outline"}
              className="text-[10px] shrink-0"
            >
              {event.status === "booked" ? "予約済" : "空き"}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              <span>
                {formatTime(event.startAt)} 〜 {formatTime(event.endAt)}（{event.durationMin}分）
              </span>
            </div>
            {event.applicantName && (
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 shrink-0" />
                <span>{event.applicantName}</span>
              </div>
            )}
            {event.applicantEmail && (
              <div className="flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" />
                <span>{event.applicantEmail}</span>
              </div>
            )}
            {event.jobTitle && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 shrink-0" />
                <span>{event.jobTitle}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          <Button variant="primary" size="sm" className="w-full" onClick={handleNavigate}>
            詳細を開く
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Component ----------

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

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

  const {
    data: events = [],
    error: eventsError,
    mutate: mutateEvents,
  } = useCalendarEvents(currentMonth, rangeStart, rangeEnd);

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

  const eventsForDate = (date: Date) => events.filter((e) => isSameDay(e.startAt, date));

  const today = new Date();

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-(--spacing(14)))]">
      <QueryErrorBanner error={eventsError} onRetry={() => mutateEvents()} />
      <PageHeader
        title="カレンダー"
        description="面接日程を一覧表示"
        sticky={false}
        border={false}
      />

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

        {/* Calendar grid - full width */}
        <div className="flex-1 min-h-0 flex flex-col border rounded-lg md:rounded-xl lg:rounded-2xl overflow-hidden bg-white">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "text-center text-xs font-medium py-2 bg-slate-50",
                  i < 6 && "border-r",
                  i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div
            className="grid grid-cols-7 flex-1"
            style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
          >
            {weeks.flat().map((date) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(date, today);
              const dayEvents = eventsForDate(date);
              const dayOfWeek = dayOfWeekMon(date);

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "relative p-1 overflow-hidden flex flex-col",
                    dayOfWeek < 6 && "border-r",
                    "border-b",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm self-center",
                      isToday && "bg-primary text-primary-foreground font-bold",
                      !isCurrentMonth && "text-muted-foreground/50",
                      dayOfWeek === 5 && isCurrentMonth && !isToday && "text-blue-500",
                      dayOfWeek === 6 && isCurrentMonth && !isToday && "text-red-500"
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {/* Event items */}
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 space-y-0.5 w-full overflow-hidden flex-1">
                      {/* Mobile: dots only */}
                      <div className="flex gap-0.5 justify-center sm:hidden">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              ev.status === "booked" ? "bg-primary" : "bg-muted-foreground/40"
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted-foreground leading-none">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                      {/* Desktop: clickable event labels with popover */}
                      <div className="hidden sm:block space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <EventPopover key={ev.id} event={ev}>
                            <div
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer transition-colors",
                                ev.status === "booked"
                                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {formatTime(ev.startAt)} {ev.applicantName ?? ev.title}
                            </div>
                          </EventPopover>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 3}件
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
