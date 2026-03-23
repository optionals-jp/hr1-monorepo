"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { cn, formatDateLocal, formatTime, formatMinutesHM, weekdayLabel } from "@/lib/utils";
import type {
  AttendanceRecord,
  AttendancePunch,
  AttendanceSettingsRow,
  Profile,
} from "@/types/database";
import { attendanceStatusLabels, attendanceStatusColors, punchTypeLabels } from "@/lib/constants";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Coffee,
  Moon,
  Timer,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

/** 勤務時間（分）を計算 */
function calcWorkMinutes(r: AttendanceRecord): number {
  if (!r.clock_in || !r.clock_out) return 0;
  const diff = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
  return Math.round(diff / 60000) - r.break_minutes;
}

/** 時刻→分（基準日の0:00起点）に変換。日またぎは24h+で返す */
function timeToMinutes(iso: string, baseDate?: Date): number {
  const d = new Date(iso);
  let minutes = d.getHours() * 60 + d.getMinutes();
  if (baseDate) {
    const diffDays = Math.floor((d.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays > 0) {
      minutes += diffDays * 24 * 60;
    }
  }
  return minutes;
}

/** タイムラインバー */
function TimelineBar({
  clockIn,
  clockOut,
  punches,
  settings,
}: {
  clockIn: string | null;
  clockOut: string | null;
  punches: AttendancePunch[];
  settings: AttendanceSettingsRow | null;
}) {
  const RANGE_START = 6 * 60;
  // 深夜勤務を表示するため翌2:00（26時）まで
  const RANGE_END = 26 * 60;
  const RANGE = RANGE_END - RANGE_START;

  const toPercent = (min: number) =>
    Math.max(0, Math.min(100, ((min - RANGE_START) / RANGE) * 100));

  if (!clockIn)
    return (
      <div className="h-6 bg-muted/30 rounded text-xs text-muted-foreground flex items-center justify-center">
        -
      </div>
    );

  // 出勤日の0:00を基準にして日またぎを+24hで表現
  const baseDate = new Date(
    new Date(clockIn).getFullYear(),
    new Date(clockIn).getMonth(),
    new Date(clockIn).getDate()
  );
  const inMin = timeToMinutes(clockIn, baseDate);
  const outMin = clockOut ? timeToMinutes(clockOut, baseDate) : null;

  const breakPeriods: { start: number; end: number }[] = [];
  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );
  let breakStart: number | null = null;
  for (const p of sortedPunches) {
    if (p.punch_type === "break_start") {
      breakStart = timeToMinutes(p.punched_at, baseDate);
    } else if (p.punch_type === "break_end" && breakStart !== null) {
      breakPeriods.push({ start: breakStart, end: timeToMinutes(p.punched_at, baseDate) });
      breakStart = null;
    }
  }

  const workStart = settings?.work_start_time
    ? parseInt(settings.work_start_time.split(":")[0]) * 60 +
      parseInt(settings.work_start_time.split(":")[1])
    : null;
  const workEnd = settings?.work_end_time
    ? parseInt(settings.work_end_time.split(":")[0]) * 60 +
      parseInt(settings.work_end_time.split(":")[1])
    : null;

  return (
    <div className="relative h-6 bg-muted/30 rounded overflow-hidden">
      {workStart !== null && workEnd !== null && (
        <div
          className="absolute top-0 bottom-0 bg-blue-50"
          style={{
            left: `${toPercent(workStart)}%`,
            width: `${toPercent(workEnd) - toPercent(workStart)}%`,
          }}
        />
      )}
      {outMin !== null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400 rounded-sm"
          style={{
            left: `${toPercent(inMin)}%`,
            width: `${Math.max(0.5, toPercent(outMin) - toPercent(inMin))}%`,
          }}
        />
      )}
      {outMin === null && (
        <div
          className="absolute top-1 bottom-1 bg-blue-400/60 rounded-sm animate-pulse"
          style={{ left: `${toPercent(inMin)}%`, right: "0%" }}
        />
      )}
      {breakPeriods.map((bp, i) => (
        <div
          key={i}
          className="absolute top-1 bottom-1 bg-amber-300 rounded-sm"
          style={{
            left: `${toPercent(bp.start)}%`,
            width: `${Math.max(0.3, toPercent(bp.end) - toPercent(bp.start))}%`,
          }}
        />
      ))}
      {outMin !== null && workEnd !== null && outMin > workEnd && (
        <div
          className="absolute top-1 bottom-1 bg-red-400/70 rounded-sm"
          style={{
            left: `${toPercent(workEnd)}%`,
            width: `${toPercent(outMin) - toPercent(workEnd)}%`,
          }}
        />
      )}
      {[6, 9, 12, 15, 18, 21, 24].map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 border-l border-muted-foreground/10"
          style={{ left: `${toPercent(h * 60)}%` }}
        >
          <span className="absolute -top-0.5 left-0.5 text-[8px] text-muted-foreground/40 leading-none">
            {h}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 打刻種別のアイコン色 */
const punchTypeColors: Record<string, string> = {
  clock_in: "bg-green-500",
  clock_out: "bg-gray-500",
  break_start: "bg-amber-400",
  break_end: "bg-amber-600",
};

/** 日別詳細（展開行） */
function DayDetail({
  record,
  punches,
  settings,
}: {
  record: AttendanceRecord | null;
  punches: AttendancePunch[];
  settings: AttendanceSettingsRow | null;
}) {
  const sortedPunches = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 打刻履歴 */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">打刻履歴</h4>
          {sortedPunches.length === 0 ? (
            <p className="text-sm text-muted-foreground">打刻データなし</p>
          ) : (
            <div className="space-y-1.5">
              {sortedPunches.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        punchTypeColors[p.punch_type] ?? "bg-gray-400"
                      )}
                    />
                    {i < sortedPunches.length - 1 && <span className="w-px h-4 bg-border" />}
                  </div>
                  <span className="font-mono text-sm w-14">{formatTime(p.punched_at)}</span>
                  <span className="text-sm">{punchTypeLabels[p.punch_type] ?? p.punch_type}</span>
                  {p.note && <span className="text-xs text-muted-foreground ml-2">({p.note})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 勤務サマリー */}
        {record && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">勤務サマリー</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                <span className="text-muted-foreground">出勤</span>
                <span className="font-mono">{formatTime(record.clock_in)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                <span className="text-muted-foreground">退勤</span>
                <span className="font-mono">{formatTime(record.clock_out)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                <span className="text-muted-foreground">休憩</span>
                <span className="font-mono">
                  {record.break_minutes > 0 ? formatMinutesHM(record.break_minutes) : "-"}
                </span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                <span className="text-muted-foreground">勤務時間</span>
                <span className="font-mono">{formatMinutesHM(calcWorkMinutes(record))}</span>
              </div>
              {record.overtime_minutes > 0 && (
                <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                  <span className="text-muted-foreground">残業</span>
                  <span className="font-mono text-red-600">
                    {formatMinutesHM(record.overtime_minutes)}
                  </span>
                </div>
              )}
              {record.late_night_minutes > 0 && (
                <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                  <span className="text-muted-foreground">深夜</span>
                  <span className="font-mono text-purple-600">
                    {formatMinutesHM(record.late_night_minutes)}
                  </span>
                </div>
              )}
              {settings && (
                <div className="flex justify-between px-3 py-1.5 bg-background rounded border">
                  <span className="text-muted-foreground">定時</span>
                  <span className="font-mono text-xs">
                    {settings.work_start_time}〜{settings.work_end_time}
                  </span>
                </div>
              )}
            </div>
            {record.note && (
              <div className="mt-2 px-3 py-1.5 bg-background rounded border text-sm">
                <span className="text-muted-foreground mr-2">備考:</span>
                {record.note}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 拡大タイムライン */}
      {record && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">タイムライン</h4>
          <div className="h-8">
            <TimelineBar
              clockIn={record.clock_in}
              clockOut={record.clock_out}
              punches={punches}
              settings={settings}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { organization } = useOrg();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // 社員プロフィール
  const { data: profile } = useQuery<Profile | null>(
    organization ? `attendance-detail-profile-${userId}` : null,
    async () => {
      const { data: membership } = await getSupabase()
        .from("user_organizations")
        .select("user_id")
        .eq("user_id", userId)
        .eq("organization_id", organization!.id)
        .maybeSingle();
      if (!membership) return null;
      const { data } = await getSupabase().from("profiles").select("*").eq("id", userId).single();
      return data as Profile;
    }
  );

  // 月間の勤怠レコード
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const {
    data: records = [],
    isLoading: recordsLoading,
    error: recordsError,
    mutate: mutateRecords,
  } = useQuery<AttendanceRecord[]>(
    organization ? `attendance-detail-records-${userId}-${year}-${month}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_records")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organization!.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });
      return (data ?? []) as AttendanceRecord[];
    }
  );

  // 月間の打刻履歴
  const { data: punches = [] } = useQuery<AttendancePunch[]>(
    organization ? `attendance-detail-punches-${userId}-${year}-${month}` : null,
    async () => {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);
      const { data } = await getSupabase()
        .from("attendance_punches")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organization!.id)
        .gte("punched_at", monthStart.toISOString())
        .lt("punched_at", monthEnd.toISOString())
        .order("punched_at", { ascending: true });
      return (data ?? []) as AttendancePunch[];
    }
  );

  // 設定
  const { data: settings } = useQuery<AttendanceSettingsRow | null>(
    organization ? `attendance-settings-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("attendance_settings")
        .select("*")
        .eq("organization_id", organization!.id)
        .maybeSingle();
      return data as AttendanceSettingsRow | null;
    }
  );

  // 日付ごとの打刻をグループ化
  const punchesByDate = useMemo(() => {
    const map = new Map<string, AttendancePunch[]>();
    for (const p of punches) {
      const date = formatDateLocal(new Date(p.punched_at));
      const arr = map.get(date) ?? [];
      arr.push(p);
      map.set(date, arr);
    }
    return map;
  }, [punches]);

  // レコードを日付でマップ化
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records) {
      map.set(r.date, r);
    }
    return map;
  }, [records]);

  // カレンダー日付一覧を生成
  const calendarDays = useMemo(() => {
    const days: { date: string; dayOfWeek: number; isToday: boolean }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = formatDateLocal(dateObj);
      days.push({
        date: dateStr,
        dayOfWeek: dateObj.getDay(),
        isToday: dateStr === formatDateLocal(new Date()),
      });
    }
    return days;
  }, [year, month, lastDay]);

  // 月次サマリー集計
  const monthlySummary = useMemo(() => {
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalLateNightMinutes = 0;

    for (const r of records) {
      if (r.status === "present" || r.status === "late" || r.status === "early_leave") {
        presentDays++;
      }
      if (r.status === "late") lateDays++;
      if (r.status === "absent") absentDays++;
      totalWorkMinutes += calcWorkMinutes(r);
      totalBreakMinutes += r.break_minutes;
      totalOvertimeMinutes += r.overtime_minutes;
      totalLateNightMinutes += r.late_night_minutes;
    }

    return {
      presentDays,
      lateDays,
      absentDays,
      totalWorkMinutes,
      totalBreakMinutes,
      totalOvertimeMinutes,
      totalLateNightMinutes,
    };
  }, [records]);

  const shiftMonth = (dir: number) => {
    let y = year;
    let m = month + dir;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  };

  const displayName = profile?.display_name ?? profile?.email ?? "";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${displayName}の勤怠詳細`}
        description={profile?.position ?? undefined}
        breadcrumb={[{ label: "勤怠管理", href: "/attendance" }]}
        action={
          <Button variant="outline" size="sm" onClick={() => router.push(`/employees/${userId}`)}>
            社員詳細
          </Button>
        }
      />

      <QueryErrorBanner error={recordsError} onRetry={() => mutateRecords()} />

      <div className="px-4 py-4 sm:px-6 md:px-8 space-y-6">
        {/* プロフィールヘッダー */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{displayName[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.department && (
              <p className="text-sm text-muted-foreground">{profile.department}</p>
            )}
          </div>
        </div>

        {/* 月ナビゲーション */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {year}年{month}月
          </span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth() + 1);
            }}
          >
            今月
          </Button>
        </div>

        {/* 月次サマリーカード */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-50 p-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">出勤日数</p>
                <p className="text-xl font-semibold">{monthlySummary.presentDays}日</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-yellow-50 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">遅刻</p>
                <p className="text-xl font-semibold">{monthlySummary.lateDays}日</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-50 p-2">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">欠勤</p>
                <p className="text-xl font-semibold">{monthlySummary.absentDays}日</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総勤務時間</p>
                <p className="text-xl font-semibold">
                  {formatMinutesHM(monthlySummary.totalWorkMinutes)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-50 p-2">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総休憩時間</p>
                <p className="text-xl font-semibold">
                  {formatMinutesHM(monthlySummary.totalBreakMinutes)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-50 p-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総残業時間</p>
                <p className="text-xl font-semibold">
                  {formatMinutesHM(monthlySummary.totalOvertimeMinutes)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-50 p-2">
                <Moon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総深夜時間</p>
                <p className="text-xl font-semibold">
                  {formatMinutesHM(monthlySummary.totalLateNightMinutes)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 日別勤怠テーブル */}
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">日付</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>出勤</TableHead>
                <TableHead>退勤</TableHead>
                <TableHead>休憩</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>残業</TableHead>
                <TableHead>深夜</TableHead>
                <TableHead className="w-55">タイムライン</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={9}
                isLoading={recordsLoading}
                isEmpty={calendarDays.length === 0}
                emptyMessage="表示するデータがありません"
              >
                {calendarDays.map(({ date, dayOfWeek, isToday }) => {
                  const record = recordsByDate.get(date);
                  const dayPunches = punchesByDate.get(date) ?? [];
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const dayNum = parseInt(date.slice(8));
                  const isExpanded = expandedDate === date;
                  const hasData = !!record || dayPunches.length > 0;

                  return (
                    <React.Fragment key={date}>
                      <TableRow
                        className={cn(
                          isToday && "bg-blue-50/50",
                          isWeekend && !record && "bg-muted/20",
                          hasData && "cursor-pointer hover:bg-muted/40",
                          isExpanded && "bg-muted/30"
                        )}
                        onClick={() => hasData && setExpandedDate(isExpanded ? null : date)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {hasData && (
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            )}
                            {isToday && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            )}
                            <span
                              className={cn(
                                "text-sm font-medium",
                                dayOfWeek === 0 && "text-red-500",
                                dayOfWeek === 6 && "text-blue-500"
                              )}
                            >
                              {dayNum}日（{weekdayLabel(new Date(year, month - 1, dayNum))}）
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record ? (
                            <Badge variant={attendanceStatusColors[record.status] ?? "outline"}>
                              {attendanceStatusLabels[record.status] ?? record.status}
                            </Badge>
                          ) : isWeekend ? (
                            <span className="text-xs text-muted-foreground">休日</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record ? formatTime(record.clock_in) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record ? formatTime(record.clock_out) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record && record.break_minutes > 0
                            ? formatMinutesHM(record.break_minutes)
                            : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record ? formatMinutesHM(calcWorkMinutes(record)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record && record.overtime_minutes > 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatMinutesHM(record.overtime_minutes)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record && record.late_night_minutes > 0 ? (
                            <span className="text-purple-600 font-medium">
                              {formatMinutesHM(record.late_night_minutes)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {record ? (
                            <TimelineBar
                              clockIn={record.clock_in}
                              clockOut={record.clock_out}
                              punches={dayPunches}
                              settings={settings ?? null}
                            />
                          ) : (
                            <div className="h-6 bg-muted/20 rounded" />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={9} className="p-0">
                            <DayDetail
                              record={record ?? null}
                              punches={dayPunches}
                              settings={settings ?? null}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableEmptyState>
            </TableBody>
          </Table>
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-blue-50 border border-blue-200 mr-1" />
            定時
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1" />
            勤務
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-amber-300 mr-1" />
            休憩
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1" />
            残業
          </span>
        </div>

        {organization && (
          <div className="border rounded-lg bg-white">
            <button
              type="button"
              className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium"
              onClick={() => setShowAuditLog((v) => !v)}
            >
              変更履歴
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showAuditLog && "rotate-180"
                )}
              />
            </button>
            {showAuditLog && (
              <div className="px-5 pb-4">
                <AuditLogPanel
                  organizationId={organization.id}
                  tableName="attendance_records"
                  recordIds={records.map((r) => r.id)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
