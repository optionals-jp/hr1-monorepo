"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Briefcase,
  Clock,
  User,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface CalendarEventLink {
  label: string;
  href: string;
}

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  /** ISO 8601 文字列。Supabase timestamptz カラム互換。 */
  startAt: string;
  /** ISO 8601 文字列。Supabase timestamptz カラム互換。 */
  endAt: string;
  durationMin: number;
  applicantName?: string | null;
  applicantEmail?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  status?: "booked" | "available" | string;
  /** ポップオーバー内に表示する詳細画面へのリンク一覧。 */
  links?: CalendarEventLink[];
}

export interface MonthCalendarProps {
  events: CalendarEvent[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  renderEventMenu?: (event: CalendarEvent) => ReactNode;
  className?: string;
}

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

function dayOfWeekMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/**
 * 指定月のカレンダーグリッド表示範囲（月曜始まり・6週固定ではなく必要分）を返す。
 * データ取得のレンジ指定にも利用する。
 */
export function calendarRangeForMonth(month: Date): { start: Date; end: Date } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - dayOfWeekMon(start));
  start.setHours(0, 0, 0, 0);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  end.setDate(end.getDate() + (6 - dayOfWeekMon(end)));
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function DefaultEventDetails({ event }: { event: CalendarEvent }) {
  const isBooked = event.status === "booked" || event.status === "予約済";
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-snug">{event.title}</h3>
        {event.status && (
          <Badge variant={isBooked ? "default" : "outline"} className="text-[10px] shrink-0">
            {isBooked ? "予約済" : "空き"}
          </Badge>
        )}
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          <span>
            {formatTime(new Date(event.startAt))} 〜 {formatTime(new Date(event.endAt))}（
            {event.durationMin}分）
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
      {event.links && event.links.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1">
            {event.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span>{link.label}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventMenuPopover({
  event,
  renderMenu,
  children,
}: {
  event: CalendarEvent;
  renderMenu?: (event: CalendarEvent) => ReactNode;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="w-full text-left" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="right" sideOffset={8}>
        {renderMenu ? renderMenu(event) : <DefaultEventDetails event={event} />}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 月表示カレンダー（全画面対応）。
 * 親が `h-full` を提供できるコンテナ内に配置する想定。
 */
export function MonthCalendar({
  events,
  currentMonth,
  onMonthChange,
  renderEventMenu,
  className,
}: MonthCalendarProps) {
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => calendarRangeForMonth(currentMonth),
    [currentMonth]
  );

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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const today = new Date();

  const prevMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevMonth} aria-label="前の月">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold min-w-32 text-center">
            {formatMonth(currentMonth)}
          </h2>
          <Button variant="ghost" size="sm" onClick={nextMonth} aria-label="次の月">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          今日
        </Button>
      </div>

      {/* Calendar grid - full width & height */}
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
            const dowMon = dayOfWeekMon(date);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const dayEvents = eventsByDate.get(key) ?? [];

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "relative p-1 overflow-hidden flex flex-col",
                  dowMon < 6 && "border-r",
                  "border-b",
                  !isCurrentMonth && "bg-muted/30"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm self-center",
                    isToday && "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground/50",
                    dowMon === 5 && isCurrentMonth && !isToday && "text-blue-500",
                    dowMon === 6 && isCurrentMonth && !isToday && "text-red-500"
                  )}
                >
                  {date.getDate()}
                </span>

                {dayEvents.length > 0 && (
                  <div className="mt-0.5 space-y-0.5 w-full overflow-hidden flex-1">
                    {/* Mobile: dots only */}
                    <div className="flex gap-0.5 justify-center sm:hidden">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventMenuPopover key={ev.id} event={ev} renderMenu={renderEventMenu}>
                          <span
                            className={cn(
                              "inline-block h-1.5 w-1.5 rounded-full",
                              ev.status === "booked" || ev.status === "予約済"
                                ? "bg-primary"
                                : "bg-muted-foreground/40"
                            )}
                          />
                        </EventMenuPopover>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground leading-none">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                    {/* Desktop: clickable event labels with popover */}
                    <div className="hidden sm:block space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventMenuPopover key={ev.id} event={ev} renderMenu={renderEventMenu}>
                          <div
                            className={cn(
                              "truncate rounded px-1.5 py-1 text-[11px] leading-tight cursor-pointer transition-colors",
                              ev.status === "booked" || ev.status === "予約済"
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {formatTime(new Date(ev.startAt))} {ev.applicantName ?? ev.title}
                          </div>
                        </EventMenuPopover>
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
  );
}
