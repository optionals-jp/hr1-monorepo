"use client";

import { useMemo, useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyAttendance } from "@/lib/hooks/use-my-attendance";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { CorrectionDialog } from "./correction-dialog";
import type { AttendanceRecord } from "@/types/database";

const statusLabels: Record<string, string> = {
  present: "出勤",
  absent: "欠勤",
  late: "遅刻",
  early_leave: "早退",
  paid_leave: "有給",
  half_leave: "半休",
  holiday: "休日",
};

const punchTypeLabels: Record<string, string> = {
  clock_in: "出勤",
  clock_out: "退勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
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
    isClockedIn,
    isOnBreak,
    doPunch,
    corrections,
    requestCorrection,
  } = useMyAttendance();

  const { showToast } = useToast();
  const now = new Date();
  const currentTime = format(now, "HH:mm");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);

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

  const handleCorrectionSubmit = async (data: {
    record_id: string;
    original_clock_in: string | null;
    original_clock_out: string | null;
    requested_clock_in: string | null;
    requested_clock_out: string | null;
    reason: string;
  }) => {
    try {
      await requestCorrection(data);
      showToast("補正申請を提出しました");
    } catch {
      showToast("補正申請に失敗しました", "error");
    }
  };

  const summary = useMemo(() => {
    const presentDays = records.filter((r) => r.status === "present").length;
    const totalWork = records.reduce((s, r) => s + r.work_minutes, 0);
    const totalBreak = records.reduce((s, r) => s + r.break_minutes, 0);
    const totalOvertime = records.reduce((s, r) => s + r.overtime_minutes, 0);
    return { presentDays, totalWork, totalBreak, totalOvertime };
  }, [records]);

  const fmtMin = (m: number) => `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, "0")}m`;

  return (
    <div className="flex flex-col">
      <PageHeader title="勤怠" description="出退勤の記録と勤務履歴" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutateRecords()} />}

      <PageContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ===== 左カラム: 打刻 + 今日の記録 ===== */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* 打刻ボタン */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{currentTime}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOnBreak ? "休憩中" : isClockedIn ? "勤務中" : "未出勤"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handlePunch("clock_in")}
                    disabled={isClockedIn || isOnBreak}
                  >
                    <LogIn className="h-4 w-4 mr-1.5" />
                    出勤
                  </Button>
                  {isClockedIn && !isOnBreak && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePunch("break_start")}
                    >
                      <Coffee className="h-4 w-4 mr-1.5" />
                      休憩
                    </Button>
                  )}
                  {isOnBreak && (
                    <Button size="sm" variant="secondary" onClick={() => handlePunch("break_end")}>
                      <Play className="h-4 w-4 mr-1.5" />
                      休憩終了
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePunch("clock_out")}
                    disabled={!isClockedIn && !isOnBreak}
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    退勤
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 今日の打刻履歴 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  今日の記録
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayPunches.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">打刻がありません</p>
                ) : (
                  <div className="space-y-2">
                    {todayPunches.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {punchTypeLabels[p.punch_type] ?? p.punch_type}
                        </span>
                        <span className="font-medium tabular-nums">
                          {format(new Date(p.punched_at), "HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 修正申請履歴 */}
            {corrections.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    修正申請
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {corrections.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs">
                        <Badge
                          variant={
                            c.status === "approved"
                              ? "default"
                              : c.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px] w-14 justify-center"
                        >
                          {c.status === "pending"
                            ? "申請中"
                            : c.status === "approved"
                              ? "承認済"
                              : "却下"}
                        </Badge>
                        <span className="text-muted-foreground truncate">{c.reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== 右カラム: 月次勤怠 + サマリー ===== */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* 月ナビ + サマリー */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="前の月"
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
                  aria-label="次の月"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {records.length > 0 && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    出勤 <strong className="text-foreground">{summary.presentDays}日</strong>
                  </span>
                  <span>
                    勤務 <strong className="text-foreground">{fmtMin(summary.totalWork)}</strong>
                  </span>
                  <span>
                    休憩 <strong className="text-foreground">{fmtMin(summary.totalBreak)}</strong>
                  </span>
                  {summary.totalOvertime > 0 && (
                    <span>
                      残業{" "}
                      <strong className="text-orange-600">{fmtMin(summary.totalOvertime)}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 月次一覧 */}
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
            ) : records.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                この月の勤務記録はありません
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
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
                    {r.break_minutes > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        休{r.break_minutes}分
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                      {fmtMin(r.work_minutes)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 w-7 p-0"
                      aria-label="修正"
                      onClick={() => {
                        setCorrectionTarget(r);
                        setCorrectionOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContent>

      <CorrectionDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        record={correctionTarget}
        onSubmit={handleCorrectionSubmit}
      />
    </div>
  );
}
