"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { cn, formatYearMonth, weekdayLabel } from "@/lib/utils";
import type { ShiftRequest, ShiftSchedule, Profile } from "@/types/database";
import { shiftScheduleStatusLabels, shiftScheduleStatusColors } from "@/lib/constants";
import { ChevronLeft, ChevronRight, CalendarRange, ClipboardList, Send } from "lucide-react";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type TabValue = "requests" | "schedule";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "requests", label: "シフト希望", icon: ClipboardList },
  { value: "schedule", label: "シフト表", icon: CalendarRange },
];

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

type RequestWithProfile = ShiftRequest & {
  profiles: { display_name: string | null; email: string };
};

type ScheduleWithProfile = ShiftSchedule & {
  profiles: { display_name: string | null; email: string };
};

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getDay() === 0 || d.getDay() === 6;
}

function timeShort(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

export default function ShiftsPage() {
  const { organization } = useOrg();
  const orgId = organization?.id ?? null;
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabValue>("requests");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [publishing, setPublishing] = useState(false);

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  const ym = formatYearMonth(year, month);
  const totalDays = daysInMonth(year, month);

  // シフト希望取得
  const {
    data: requests,
    error: requestsError,
    mutate: mutateReqs,
  } = useQuery<RequestWithProfile[]>(orgId ? `shift-requests-${orgId}-${ym}` : null, async () => {
    const sb = getSupabase();
    const { data } = await sb
      .from("shift_requests")
      .select("*, profiles!shift_requests_user_id_fkey(display_name, email)")
      .eq("organization_id", orgId!)
      .gte("target_date", `${ym}-01`)
      .lte("target_date", `${ym}-${totalDays}`)
      .order("target_date");
    return (data ?? []) as RequestWithProfile[];
  });

  // 確定シフト取得
  const { data: schedules, mutate: mutateSch } = useQuery<ScheduleWithProfile[]>(
    orgId ? `shift-schedules-${orgId}-${ym}` : null,
    async () => {
      const sb = getSupabase();
      const { data } = await sb
        .from("shift_schedules")
        .select("*, profiles!shift_schedules_user_id_fkey(display_name, email)")
        .eq("organization_id", orgId!)
        .gte("target_date", `${ym}-01`)
        .lte("target_date", `${ym}-${totalDays}`)
        .order("target_date");
      return (data ?? []) as ScheduleWithProfile[];
    }
  );

  // 社員一覧取得
  const { data: employees } = useQuery<Employee[]>(
    orgId ? `shift-employees-${orgId}` : null,
    async () => {
      const sb = getSupabase();
      const { data } = await sb
        .from("user_organizations")
        .select("user_id, profiles!user_organizations_user_id_fkey(id, display_name, email)")
        .eq("organization_id", orgId!)
        .in("role", ["employee", "admin", "owner"]);
      return (data ?? []).map((row: Record<string, unknown>) => {
        const p = row.profiles as Record<string, unknown> | null;
        return {
          id: row.user_id as string,
          email: (p?.email as string) ?? "",
          display_name: (p?.display_name as string | null) ?? null,
        };
      });
    }
  );

  // 希望をグループ化: userId → dateStr → request
  const requestMap = useMemo(() => {
    const map = new Map<string, Map<string, RequestWithProfile>>();
    for (const r of requests ?? []) {
      if (!map.has(r.user_id)) map.set(r.user_id, new Map());
      map.get(r.user_id)!.set(r.target_date, r);
    }
    return map;
  }, [requests]);

  // 確定をグループ化
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleWithProfile>>();
    for (const s of schedules ?? []) {
      if (!map.has(s.user_id)) map.set(s.user_id, new Map());
      map.get(s.user_id)!.set(s.target_date, s);
    }
    return map;
  }, [schedules]);

  // 希望からシフト表を自動生成
  const handleAutoFill = useCallback(async () => {
    if (!orgId || !requests) return;
    const sb = getSupabase();
    const userId = (await sb.auth.getUser()).data.user?.id;

    const upserts = requests
      .filter((r) => r.is_available && r.start_time && r.end_time)
      .map((r) => ({
        user_id: r.user_id,
        organization_id: orgId,
        target_date: r.target_date,
        start_time: r.start_time!,
        end_time: r.end_time!,
        status: "draft",
      }));

    if (upserts.length === 0) {
      showToast("反映するデータがありません", "error");
      return;
    }

    const { error } = await sb
      .from("shift_schedules")
      .upsert(upserts, { onConflict: "user_id,organization_id,target_date" });

    if (error) {
      showToast(`反映に失敗しました: ${error.message}`, "error");
    } else {
      showToast(`${upserts.length}件のシフトを反映しました`);
      mutateSch();
    }
  }, [orgId, requests, showToast, mutateSch]);

  // 公開
  const handlePublish = useCallback(async () => {
    if (!orgId) return;
    setPublishing(true);
    const sb = getSupabase();
    const userId = (await sb.auth.getUser()).data.user?.id;

    const { error } = await sb
      .from("shift_schedules")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_by: userId,
      })
      .eq("organization_id", orgId)
      .eq("status", "draft")
      .gte("target_date", `${ym}-01`)
      .lte("target_date", `${ym}-${totalDays}`);

    setPublishing(false);
    if (error) {
      showToast(`公開に失敗しました: ${error.message}`, "error");
    } else {
      showToast("シフトを公開しました");
      mutateSch();
    }
  }, [orgId, ym, totalDays, showToast, mutateSch]);

  const draftCount = (schedules ?? []).filter((s) => s.status === "draft").length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="シフト管理" sticky border />

      {/* タブ + 月セレクター */}
      <div className="flex items-center justify-between border-b px-6 py-2">
        <div className="flex gap-1">
          {tabList.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                tab === t.value
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            {year}年{month}月
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QueryErrorBanner error={requestsError} onRetry={() => mutateReqs()} />

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "requests" && (
          <RequestsGrid
            employees={employees ?? []}
            requestMap={requestMap}
            year={year}
            month={month}
            totalDays={totalDays}
          />
        )}

        {tab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleAutoFill}>
                <ClipboardList className="h-4 w-4 mr-1.5" />
                希望から反映
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={publishing || draftCount === 0}>
                <Send className="h-4 w-4 mr-1.5" />
                {draftCount > 0 ? `公開（${draftCount}件）` : "公開済み"}
              </Button>
            </div>

            <ScheduleGrid
              employees={employees ?? []}
              scheduleMap={scheduleMap}
              requestMap={requestMap}
              year={year}
              month={month}
              totalDays={totalDays}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// シフト希望グリッド
// ---------------------------------------------------------------------------

function RequestsGrid({
  employees,
  requestMap,
  year,
  month,
  totalDays,
}: {
  employees: Employee[];
  requestMap: Map<string, Map<string, RequestWithProfile>>;
  year: number;
  month: number;
  totalDays: number;
}) {
  // 提出済みの社員のみ表示
  const submittedEmployees = employees.filter((e) => {
    const reqs = requestMap.get(e.id);
    if (!reqs) return false;
    return Array.from(reqs.values()).some((r) => r.submitted_at);
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-35">社員</TableHead>
            {Array.from({ length: totalDays }, (_, i) => {
              const d = i + 1;
              const we = isWeekend(year, month, d);
              return (
                <TableHead
                  key={d}
                  className={cn("text-center min-w-15 text-xs", we && "bg-muted/50")}
                >
                  <div>{d}</div>
                  <div className={cn("text-[10px]", we && "text-red-500")}>
                    {weekdayLabel(new Date(year, month - 1, d))}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {submittedEmployees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalDays + 1}>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  提出済みのシフト希望がありません
                </p>
              </TableCell>
            </TableRow>
          ) : (
            submittedEmployees.map((emp) => {
              const reqs = requestMap.get(emp.id) ?? new Map();
              return (
                <TableRow key={emp.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {(emp.display_name ?? emp.email).slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-25">
                        {emp.display_name ?? emp.email}
                      </span>
                    </div>
                  </TableCell>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const req = reqs.get(dateStr);
                    const we = isWeekend(year, month, d);

                    return (
                      <TableCell
                        key={d}
                        className={cn("text-center text-xs p-1", we && "bg-muted/30")}
                      >
                        {req ? (
                          req.is_available ? (
                            <div className="text-[11px] leading-tight">
                              <div className="text-green-600 font-medium">
                                {timeShort(req.start_time)}
                              </div>
                              <div className="text-green-600">{timeShort(req.end_time)}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">休</span>
                          )
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// シフト表グリッド
// ---------------------------------------------------------------------------

function ScheduleGrid({
  employees,
  scheduleMap,
  requestMap,
  year,
  month,
  totalDays,
}: {
  employees: Employee[];
  scheduleMap: Map<string, Map<string, ScheduleWithProfile>>;
  requestMap: Map<string, Map<string, RequestWithProfile>>;
  year: number;
  month: number;
  totalDays: number;
}) {
  // スケジュールまたは希望がある社員を表示
  const relevantEmployees = employees.filter((e) => scheduleMap.has(e.id) || requestMap.has(e.id));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-35">社員</TableHead>
            {Array.from({ length: totalDays }, (_, i) => {
              const d = i + 1;
              const we = isWeekend(year, month, d);
              return (
                <TableHead
                  key={d}
                  className={cn("text-center min-w-15 text-xs", we && "bg-muted/50")}
                >
                  <div>{d}</div>
                  <div className={cn("text-[10px]", we && "text-red-500")}>
                    {weekdayLabel(new Date(year, month - 1, d))}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {relevantEmployees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalDays + 1}>
                <p className="py-8 text-center text-sm text-muted-foreground">
                  シフトデータがありません。「希望から反映」でシフト希望を取り込めます
                </p>
              </TableCell>
            </TableRow>
          ) : (
            relevantEmployees.map((emp) => {
              const scheds = scheduleMap.get(emp.id) ?? new Map();
              return (
                <TableRow key={emp.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {(emp.display_name ?? emp.email).slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-25">
                        {emp.display_name ?? emp.email}
                      </span>
                    </div>
                  </TableCell>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const sch = scheds.get(dateStr);
                    const we = isWeekend(year, month, d);

                    return (
                      <TableCell
                        key={d}
                        className={cn("text-center text-xs p-1", we && "bg-muted/30")}
                      >
                        {sch ? (
                          <div
                            className={cn(
                              "text-[11px] leading-tight rounded px-0.5 py-0.5",
                              sch.status === "published"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            )}
                          >
                            <div className="font-medium">{timeShort(sch.start_time)}</div>
                            <div>{timeShort(sch.end_time)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
