"use client";

import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { cn } from "@hr1/shared-ui/lib/utils";
import type { TimelineEvent } from "@/features/recruiting/hooks/use-applicant-detail";
import {
  SlidersHorizontal,
  X,
  UserPlus,
  FileCheck,
  ClipboardList,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import { StepStatus, ApplicationStatus } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, typeof UserPlus> = {
  アカウント: UserPlus,
  応募: FileCheck,
  選考: ClipboardList,
  フォーム: FileText,
  面接: CalendarCheck,
};

interface TimelineTabProps {
  timelineEvents: TimelineEvent[];
  filteredTimeline: TimelineEvent[];
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  eventFilter: string | null;
  setEventFilter: (v: string | null) => void;
}

export function TimelineTab({
  timelineEvents,
  filteredTimeline,
  statusFilter,
  setStatusFilter,
  eventFilter,
  setEventFilter,
}: TimelineTabProps) {
  return (
    <>
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
                  カテゴリ：{eventFilter}
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
              {[...new Set(timelineEvents.map((ev) => ev.label))].map((label) => (
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
            <DropdownMenuSubTrigger className="py-2">カテゴリ</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="py-2">
              <DropdownMenuItem className="py-2" onClick={() => setEventFilter(null)}>
                <span className={cn(!eventFilter && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[...new Set(timelineEvents.map((ev) => ev.category))].map((cat) => (
                <DropdownMenuItem className="py-2" key={cat} onClick={() => setEventFilter(cat)}>
                  <span className={cn(eventFilter === cat && "font-medium")}>{cat}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {timelineEvents.length === 0 ? "ログがありません" : "該当するログがありません"}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {filteredTimeline.map((ev) => {
                const Icon = CATEGORY_ICONS[ev.category] ?? ClipboardList;
                const badgeVariant =
                  ev.status === StepStatus.Completed ||
                  ev.status === ApplicationStatus.Offered ||
                  ev.status === ApplicationStatus.OfferAccepted
                    ? "secondary"
                    : ev.status === ApplicationStatus.Rejected ||
                        ev.status === ApplicationStatus.OfferDeclined
                      ? "destructive"
                      : ev.status === ApplicationStatus.Withdrawn ||
                          ev.status === StepStatus.Skipped
                        ? "outline"
                        : "default";

                return (
                  <div key={ev.id} className="relative flex gap-3 py-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ev.actor && (
                          <span className="inline-flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                                {ev.actor[0]?.toUpperCase() ?? ""}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{ev.actor}</span>
                          </span>
                        )}
                        <span className="text-sm">{ev.eventType}</span>
                        <Badge variant={badgeVariant} className="text-xs">
                          {ev.label}
                        </Badge>
                        {ev.source !== "-" && (
                          <span className="text-xs text-muted-foreground">{ev.source}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
