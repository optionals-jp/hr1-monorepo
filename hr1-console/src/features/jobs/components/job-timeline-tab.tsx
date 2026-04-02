"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { StepStatus, ApplicationStatus } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { X, SlidersHorizontal, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import type { HistoryEvent } from "@/features/jobs/types";

interface JobTimelineTabProps {
  historyEvents: HistoryEvent[];
  historySearch: string;
  setHistorySearch: (v: string) => void;
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  eventFilter: string | null;
  setEventFilter: (v: string | null) => void;
}

export function JobTimelineTab({
  historyEvents,
  historySearch,
  statusFilter,
  setStatusFilter,
  eventFilter,
  setEventFilter,
}: JobTimelineTabProps) {
  const filtered = historyEvents.filter((ev) => {
    if (statusFilter && ev.label !== statusFilter) return false;
    if (eventFilter && ev.eventType !== eventFilter) return false;
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      ev.applicantName.toLowerCase().includes(q) || ev.applicantEmail.toLowerCase().includes(q)
    );
  });

  const badgeVariant = (ev: HistoryEvent) =>
    ev.status === StepStatus.Completed || ev.status === ApplicationStatus.Offered
      ? ("secondary" as const)
      : ev.status === ApplicationStatus.Rejected
        ? ("destructive" as const)
        : ev.status === ApplicationStatus.Withdrawn || ev.status === StepStatus.Skipped
          ? ("outline" as const)
          : ("default" as const);

  return (
    <>
      {/* フィルターバー */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {(statusFilter || eventFilter) && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {statusFilter && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  ステータス：{statusFilter}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusFilter(null);
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )}
              {eventFilter && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  イベント：{eventFilter}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEventFilter(null);
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )}
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto py-2">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">ステータス</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="py-2">
              <DropdownMenuItem className="py-2" onClick={() => setStatusFilter(null)}>
                <span className={cn(!statusFilter && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[...new Set(historyEvents.map((ev) => ev.label))].map((label) => (
                <DropdownMenuItem
                  className="py-2"
                  key={label}
                  onClick={() => setStatusFilter(label)}
                >
                  <span className={cn(statusFilter === label && "font-medium")}>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">イベント</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="py-2">
              <DropdownMenuItem className="py-2" onClick={() => setEventFilter(null)}>
                <span className={cn(!eventFilter && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[...new Set(historyEvents.map((ev) => ev.eventType))].map((type) => (
                <DropdownMenuItem className="py-2" key={type} onClick={() => setEventFilter(type)}>
                  <span className={cn(eventFilter === type && "font-medium")}>{type}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* タイムライン */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {historyEvents.length === 0 ? "ログがありません" : "該当するログがありません"}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {filtered.map((ev) => (
                <div key={ev.id} className="relative flex gap-3 py-3">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                    <ClipboardList className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                            {ev.applicantName[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold">{ev.applicantName}</span>
                      </span>
                      <span className="text-sm">{ev.eventType}</span>
                      <Badge variant={badgeVariant(ev)} className="text-xs">
                        {ev.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
