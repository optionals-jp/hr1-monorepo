"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyAttendance } from "@/lib/hooks/use-my-attendance";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Clock, LogIn, LogOut, Coffee, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  present: "出勤",
  absent: "欠勤",
  late: "遅刻",
  early_leave: "早退",
  paid_leave: "有給",
  half_leave: "半休",
  holiday: "休日",
};

export default function MyAttendancePage() {
  const {
    currentMonth,
    setCurrentMonth,
    todayPunches,
    records,
    isLoading,
    error,
    mutateRecords,
    lastPunch,
    isClockedIn,
    isOnBreak,
    doPunch,
  } = useMyAttendance();

  const { showToast } = useToast();
  const now = new Date();
  const currentTime = format(now, "HH:mm");

  const handlePunch = async (type: Parameters<typeof doPunch>[0]) => {
    try {
      await doPunch(type);
      showToast(
        type === "clock_in"
          ? "出勤しました"
          : type === "clock_out"
            ? "退勤しました"
            : type === "break_start"
              ? "休憩を開始しました"
              : "休憩を終了しました"
      );
    } catch {
      showToast("打刻に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="勤怠" description="出退勤の記録と勤務履歴" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutateRecords()} />}

      <PageContent>
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{currentTime}</p>
              <p className="text-sm text-muted-foreground">
                {isOnBreak ? "休憩中" : isClockedIn ? "勤務中" : "未出勤"}
              </p>
              <div className="flex gap-3">
                <Button onClick={() => handlePunch("clock_in")} disabled={isClockedIn || isOnBreak}>
                  <LogIn className="h-4 w-4 mr-1.5" />
                  出勤
                </Button>
                {isClockedIn && !isOnBreak && (
                  <Button variant="secondary" onClick={() => handlePunch("break_start")}>
                    <Coffee className="h-4 w-4 mr-1.5" />
                    休憩
                  </Button>
                )}
                {isOnBreak && (
                  <Button variant="secondary" onClick={() => handlePunch("break_end")}>
                    <Play className="h-4 w-4 mr-1.5" />
                    休憩終了
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handlePunch("clock_out")}
                  disabled={!isClockedIn && !isOnBreak}
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  退勤
                </Button>
              </div>

              {todayPunches.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {todayPunches.map((p) => (
                    <Badge key={p.id} variant="outline" className="text-xs">
                      {p.punch_type === "clock_in"
                        ? "出勤"
                        : p.punch_type === "clock_out"
                          ? "退勤"
                          : p.punch_type === "break_start"
                            ? "休憩開始"
                            : "休憩終了"}{" "}
                      {format(new Date(p.punched_at), "HH:mm")}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center gap-3 mb-3">
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
            ) : records.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                この月の勤務記録はありません
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm font-medium w-20 shrink-0">
                      {format(new Date(r.date), "M/d (E)", { locale: ja })}
                    </span>
                    <Badge
                      variant={
                        r.status === "present"
                          ? "default"
                          : r.status === "absent"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] w-12 justify-center"
                    >
                      {statusLabels[r.status] ?? r.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "--:--"}
                      {" 〜 "}
                      {r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "--:--"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.floor(r.work_minutes / 60)}h{r.work_minutes % 60}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </div>
  );
}
