"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { formatMinutesHM } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  AlertTriangle,
  Calendar,
  Download,
} from "lucide-react";
import { exportToCSV } from "@hr1/shared-ui";
import { useAttendanceRealtime } from "@/features/attendance/hooks/use-attendance-realtime";
import { useMonthlySummary } from "@/features/attendance/hooks/use-attendance-queries";
import { OvertimeWarningBadge } from "@/features/attendance/components/overtime-warning-badge";

export function MonthlySummaryTab() {
  const router = useRouter();
  const today = new Date();
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [monthMonth, setMonthMonth] = useState(today.getMonth() + 1);

  const {
    data: monthlySummary = [],
    isLoading: monthlyLoading,
    error: monthlyError,
    mutate: mutateMonthly,
  } = useMonthlySummary(monthYear, monthMonth);

  useAttendanceRealtime(() => {}, mutateMonthly);

  const shiftMonth = (dir: number) => {
    let y = monthYear;
    let m = monthMonth + dir;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setMonthYear(y);
    setMonthMonth(m);
  };

  return (
    <>
      <div className="px-4 py-3 sm:px-6 md:px-8 space-y-4">
        <QueryErrorBanner error={monthlyError} onRetry={() => mutateMonthly()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {monthYear}年{monthMonth}月
          </span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMonthYear(today.getFullYear());
              setMonthMonth(today.getMonth() + 1);
            }}
          >
            今月
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (monthlySummary.length === 0) return;
              exportToCSV(
                monthlySummary.map((s) => ({
                  ...s,
                  name: s.display_name ?? s.email,
                  totalWorkFormatted: formatMinutesHM(s.total_work_minutes),
                  totalOvertimeFormatted: formatMinutesHM(s.total_overtime_minutes),
                })),
                [
                  { key: "name", label: "社員名" },
                  { key: "present_days", label: "出勤日数" },
                  { key: "late_days", label: "遅刻" },
                  { key: "absent_days", label: "欠勤" },
                  { key: "leave_days", label: "休暇" },
                  { key: "totalWorkFormatted", label: "総勤務時間" },
                  { key: "totalOvertimeFormatted", label: "総残業時間" },
                ],
                `勤怠レポート_${monthYear}${String(monthMonth).padStart(2, "0")}`
              );
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV出力
          </Button>
        </div>

        {monthlySummary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">対象社員数</p>
                  <p className="text-xl font-semibold">{monthlySummary.length}名</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-green-50 p-2">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">平均労働時間</p>
                  <p className="text-xl font-semibold">
                    {formatMinutesHM(
                      Math.round(
                        monthlySummary.reduce((sum, s) => sum + s.total_work_minutes, 0) /
                          monthlySummary.length
                      )
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-violet-50 p-2">
                  <Calendar className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">平均出勤日数</p>
                  <p className="text-xl font-semibold">
                    {(
                      monthlySummary.reduce((sum, s) => sum + s.present_days, 0) /
                      monthlySummary.length
                    ).toFixed(1)}
                    日
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-red-50 p-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">総残業時間</p>
                  <p className="text-xl font-semibold">
                    {formatMinutesHM(
                      monthlySummary.reduce((sum, s) => sum + s.total_overtime_minutes, 0)
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-50">社員</TableHead>
              <TableHead className="text-center">出勤日数</TableHead>
              <TableHead className="text-center">遅刻</TableHead>
              <TableHead className="text-center">欠勤</TableHead>
              <TableHead className="text-center">休暇</TableHead>
              <TableHead className="text-center">総勤務時間</TableHead>
              <TableHead className="text-center">総残業時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={monthlyLoading}
              isEmpty={monthlySummary.length === 0}
              emptyMessage="この月の勤怠記録はありません"
            >
              {monthlySummary.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {(s.display_name || s.email)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex items-center gap-2">
                        <p
                          className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                          role="button"
                          onClick={() => router.push(`/attendance/${s.user_id}`)}
                        >
                          {s.display_name || s.email}
                        </p>
                        <OvertimeWarningBadge overtimeMinutes={s.total_overtime_minutes} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">{s.present_days}</TableCell>
                  <TableCell className="text-center">
                    {s.late_days > 0 ? (
                      <Badge variant="outline" className="text-yellow-600">
                        {s.late_days}
                      </Badge>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.absent_days > 0 ? <Badge variant="destructive">{s.absent_days}</Badge> : "0"}
                  </TableCell>
                  <TableCell className="text-center">{s.leave_days}</TableCell>
                  <TableCell className="text-center font-mono">
                    {formatMinutesHM(s.total_work_minutes)}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {s.total_overtime_minutes > 0 ? formatMinutesHM(s.total_overtime_minutes) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </>
  );
}
