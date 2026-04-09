"use client";

import { useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyShifts } from "@/lib/hooks/use-shifts";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ja } from "date-fns/locale";

export default function ShiftsPage() {
  const {
    currentMonth,
    setCurrentMonth,
    requests,
    schedules,
    isLoading,
    error,
    mutateSchedules,
    submitRequest,
  } = useMyShifts();

  const { showToast } = useToast();

  const handleSubmit = async (dateKey: string, isAvailable: boolean) => {
    try {
      await submitRequest(dateKey, isAvailable, null, null, null);
      showToast(isAvailable ? "出勤可能と提出しました" : "出勤不可と提出しました");
    } catch {
      showToast("提出に失敗しました", "error");
    }
  };

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
    [currentMonth]
  );

  const requestMap = useMemo(() => {
    const map = new Map<string, (typeof requests)[number]>();
    for (const r of requests) map.set(r.target_date, r);
    return map;
  }, [requests]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, (typeof schedules)[number]>();
    for (const s of schedules) map.set(s.target_date, s);
    return map;
  }, [schedules]);

  return (
    <div className="flex flex-col">
      <PageHeader title="シフト" description="シフトの確認" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutateSchedules()} />}

      <PageContent>
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold min-w-28 text-center">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const schedule = scheduleMap.get(dateKey);
                const request = requestMap.get(dateKey);
                const dayOfWeek = day.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div
                    key={dateKey}
                    className={cn("flex items-center gap-3 px-4 py-3", isWeekend && "bg-muted/30")}
                  >
                    <span className="text-sm font-medium w-20 shrink-0">
                      {format(day, "M/d (E)", { locale: ja })}
                    </span>

                    {schedule ? (
                      <>
                        <Badge variant="default" className="text-[10px]">
                          確定
                        </Badge>
                        <span className="text-sm tabular-nums">
                          {schedule.start_time} 〜 {schedule.end_time}
                        </span>
                      </>
                    ) : request ? (
                      <>
                        <Badge
                          variant={request.is_available ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {request.is_available ? "希望済" : "不可"}
                        </Badge>
                        {request.is_available && request.start_time && (
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {request.start_time} 〜 {request.end_time}
                          </span>
                        )}
                      </>
                    ) : null}

                    {!schedule && !request && (
                      <div className="flex gap-1 ml-auto shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleSubmit(dateKey, true)}
                        >
                          出勤可
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleSubmit(dateKey, false)}
                        >
                          不可
                        </Button>
                      </div>
                    )}
                    {request?.note && (
                      <span className="text-xs text-muted-foreground ml-auto truncate max-w-40">
                        {request.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
