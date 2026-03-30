"use client";

import React from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useShifts,
  type Employee,
  type RequestWithProfile,
  type ScheduleWithProfile,
} from "@/lib/hooks/use-shifts";
import { cn, weekdayLabel } from "@/lib/utils";

import { ChevronLeft, ChevronRight, CalendarRange, ClipboardList, Send } from "lucide-react";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";

type TabValue = "requests" | "schedule";

const tabList: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "requests", label: "シフト希望", icon: ClipboardList },
  { value: "schedule", label: "シフト表", icon: CalendarRange },
];

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

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
  const { showToast } = useToast();

  const {
    tab,
    setTab,
    year,
    month,
    prevMonth,
    nextMonth,
    publishing,
    requestsError,
    mutateReqs,
    employees,
    totalDays,
    requestMap,
    scheduleMap,
    handleAutoFill,
    handlePublish,
    draftCount,
  } = useShifts();

  const onAutoFill = async () => {
    const result = await handleAutoFill();
    if (result.success) {
      showToast(`${result.count}件のシフトを反映しました`);
    } else {
      showToast(result.error ?? "反映に失敗しました", "error");
    }
  };

  const onPublish = async () => {
    const result = await handlePublish();
    if (result.success) {
      showToast("シフトを公開しました");
    } else {
      showToast(result.error ?? "公開に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="シフト管理" sticky border />

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
              <Button variant="outline" size="sm" onClick={onAutoFill}>
                <ClipboardList className="h-4 w-4 mr-1.5" />
                希望から反映
              </Button>
              <Button size="sm" onClick={onPublish} disabled={publishing || draftCount === 0}>
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
