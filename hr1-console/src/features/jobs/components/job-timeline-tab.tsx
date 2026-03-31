"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { X, Search, SlidersHorizontal } from "lucide-react";
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
  setHistorySearch,
  statusFilter,
  setStatusFilter,
  eventFilter,
  setEventFilter,
}: JobTimelineTabProps) {
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
      {/* 検索バー */}
      <div className="flex items-center h-12 bg-white border-b px-4 sm:px-6 md:px-8">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="名前・メールで検索"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent h-12"
        />
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>応募者</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>イベント</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const filtered = historyEvents.filter((ev) => {
                if (statusFilter && ev.label !== statusFilter) return false;
                if (eventFilter && ev.eventType !== eventFilter) return false;
                if (!historySearch) return true;
                const q = historySearch.toLowerCase();
                return (
                  ev.applicantName.toLowerCase().includes(q) ||
                  ev.applicantEmail.toLowerCase().includes(q)
                );
              });
              if (filtered.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {historyEvents.length === 0 ? "ログがありません" : "該当するログがありません"}
                    </TableCell>
                  </TableRow>
                );
              }
              return filtered.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.applicantName}</TableCell>
                  <TableCell className="text-muted-foreground">{ev.applicantEmail}</TableCell>
                  <TableCell>{ev.eventType}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ev.status === StepStatus.Completed ||
                        ev.status === ApplicationStatus.Offered
                          ? "secondary"
                          : ev.status === ApplicationStatus.Rejected
                            ? "destructive"
                            : ev.status === ApplicationStatus.Withdrawn ||
                                ev.status === StepStatus.Skipped
                              ? "outline"
                              : "default"
                      }
                    >
                      {ev.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
