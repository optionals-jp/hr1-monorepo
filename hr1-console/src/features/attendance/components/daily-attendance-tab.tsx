"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { cn, formatDateLocal, formatTime, formatMinutesHM } from "@/lib/utils";
import type { AttendancePunch, AttendanceRecord, AttendanceSettingsRow } from "@/types/database";
import { attendanceStatusLabels, attendanceStatusColors, punchTypeLabels } from "@/lib/constants";
import {
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  useDailyRecords,
  useDailyPunches,
} from "@/features/attendance/hooks/use-attendance-queries";
import type { Employee } from "@/features/attendance/types";
import { TimelineBar } from "@/features/attendance/components/timeline-bar";
import { useAttendanceRealtime } from "@/features/attendance/hooks/use-attendance-realtime";
import { MissedPunchAlert } from "@/features/attendance/components/missed-punch-alert";
import { detectMissedPunches } from "@/features/attendance/utils/missed-punch-detection";

function calcWorkMinutes(r: AttendanceRecord): number {
  if (!r.clock_in || !r.clock_out) return 0;
  const diff = new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime();
  return Math.round(diff / 60000) - r.break_minutes;
}

function PunchList({ punches }: { punches: AttendancePunch[] }) {
  const sorted = [...punches].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );
  if (sorted.length === 0)
    return <p className="text-xs text-muted-foreground">打刻記録がありません</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {sorted.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              p.punch_type === "clock_in" && "bg-green-500",
              p.punch_type === "clock_out" && "bg-red-500",
              p.punch_type === "break_start" && "bg-amber-400",
              p.punch_type === "break_end" && "bg-blue-400"
            )}
          />
          <span className="text-xs font-medium">{punchTypeLabels[p.punch_type]}</span>
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(p.punched_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DailyAttendanceTabProps {
  settings: AttendanceSettingsRow | null;
  employees: Employee[];
}

export function DailyAttendanceTab({ settings, employees }: DailyAttendanceTabProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const {
    data: dailyRecords = [],
    isLoading: dailyLoading,
    error: dailyError,
    mutate: mutateDaily,
  } = useDailyRecords(selectedDate);

  const { data: dailyPunches = [] } = useDailyPunches(selectedDate);

  useAttendanceRealtime(mutateDaily, () => {});

  const punchesByUser = useMemo(() => {
    const map = new Map<string, AttendancePunch[]>();
    for (const p of dailyPunches) {
      const arr = map.get(p.user_id) ?? [];
      arr.push(p);
      map.set(p.user_id, arr);
    }
    return map;
  }, [dailyPunches]);

  const missedPunches = useMemo(() => {
    const isToday = selectedDate === formatDateLocal(new Date());
    if (!isToday || !settings) return [];
    return detectMissedPunches(employees, dailyRecords, settings, new Date());
  }, [selectedDate, settings, employees, dailyRecords]);

  const filteredDaily = useMemo(() => {
    let rows = dailyRecords;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.profiles?.display_name ?? "").toLowerCase().includes(q) ||
          (r.profiles?.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    return rows;
  }, [dailyRecords, search, filterStatus]);

  const dailySummary = useMemo(() => {
    const total = dailyRecords.length;
    const present = dailyRecords.filter(
      (r) => r.status === "present" || r.status === "late" || r.status === "early_leave"
    ).length;
    const late = dailyRecords.filter((r) => r.status === "late").length;
    const absent = dailyRecords.filter((r) => r.status === "absent").length;
    return { total, present, late, absent };
  }, [dailyRecords]);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateLocal(d));
  };

  return (
    <>
      <div className="bg-white px-4 py-3 sm:px-6 md:px-8 space-y-4">
        <QueryErrorBanner error={dailyError} onRetry={() => mutateDaily()} />
        <MissedPunchAlert employees={missedPunches} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(formatDateLocal(new Date()))}
          >
            今日
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">記録数</p>
                <p className="text-xl font-semibold">{dailySummary.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-50 p-2">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">出勤</p>
                <p className="text-xl font-semibold">{dailySummary.present}</p>
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
                <p className="text-xl font-semibold">{dailySummary.late}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-50 p-2">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">欠勤</p>
                <p className="text-xl font-semibold">{dailySummary.absent}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <StickyFilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="社員名・メールで検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {filterStatus !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  ステータス：{attendanceStatusLabels[filterStatus]}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterStatus("all");
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => setFilterStatus("all")}>
              <span className={cn(filterStatus === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(attendanceStatusLabels).map(([k, v]) => (
              <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterStatus(k)}>
                <span className={cn(filterStatus === k && "font-medium")}>{v}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-45">社員</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>出勤</TableHead>
              <TableHead>退勤</TableHead>
              <TableHead>休憩</TableHead>
              <TableHead>勤務時間</TableHead>
              <TableHead>残業</TableHead>
              <TableHead className="w-55">タイムライン</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={8}
              isLoading={dailyLoading}
              isEmpty={filteredDaily.length === 0}
              emptyMessage="この日の勤怠記録はありません"
            >
              {filteredDaily.map((r) => {
                const userPunches = punchesByUser.get(r.user_id) ?? [];
                const isExpanded = expandedRowId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {(r.profiles?.display_name ?? r.profiles?.email ?? "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium truncate text-primary hover:underline cursor-pointer"
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/attendance/${r.user_id}`);
                              }}
                            >
                              {r.profiles?.display_name ?? r.profiles?.email}
                            </p>
                            {r.profiles?.position && (
                              <p className="text-xs text-muted-foreground truncate">
                                {r.profiles.position}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={attendanceStatusColors[r.status] ?? "outline"}>
                          {attendanceStatusLabels[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatTime(r.clock_in)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatTime(r.clock_out)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.break_minutes > 0 ? formatMinutesHM(r.break_minutes) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatMinutesHM(calcWorkMinutes(r))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.overtime_minutes > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatMinutesHM(r.overtime_minutes)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <TimelineBar
                          clockIn={r.clock_in}
                          clockOut={r.clock_out}
                          punches={userPunches}
                          settings={settings ?? null}
                        />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8}>
                          <div className="py-2 space-y-2">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-semibold text-muted-foreground">
                                打刻記録
                              </span>
                              <PunchList punches={userPunches} />
                            </div>
                            {r.note && (
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  備考
                                </span>
                                <span className="text-xs text-muted-foreground">{r.note}</span>
                              </div>
                            )}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </>
  );
}
