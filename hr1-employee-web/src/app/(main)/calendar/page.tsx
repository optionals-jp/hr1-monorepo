"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useCalendarEvents } from "@/lib/hooks/use-calendar";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";
import { ja } from "date-fns/locale";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rangeStart = calStart.toISOString();
  const rangeEnd = calEnd.toISOString();

  const { data: events = [], error, mutate } = useCalendarEvents(rangeStart, rangeEnd);

  const days = useMemo(
    () => eachDayOfInterval({ start: calStart, end: calEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeStart, rangeEnd]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const ev of events) {
      const key = format(new Date(ev.startAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="カレンダー"
        description="スケジュールの確認"
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-32 text-center">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              今日
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "px-2 py-2 text-center text-xs font-medium",
                    i === 5 && "text-blue-600",
                    i === 6 && "text-red-600"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) ?? [];
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const dayOfWeek = day.getDay();

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "min-h-24 border-t border-r last:border-r-0 p-1.5",
                      !inMonth && "bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                        today && "bg-primary text-primary-foreground",
                        !today && !inMonth && "text-muted-foreground/50",
                        !today && dayOfWeek === 6 && inMonth && "text-blue-600",
                        !today && dayOfWeek === 0 && inMonth && "text-red-600"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary truncate"
                          title={`${ev.title} ${ev.applicantName ? `- ${ev.applicantName}` : ""}`}
                        >
                          {format(new Date(ev.startAt), "HH:mm")} {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 3}件
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {events.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 opacity-40" />
              <p className="text-sm">この月の予定はありません</p>
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
