"use client";

import { useState } from "react";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { cn } from "@/lib/utils";
import { useActivityLogs } from "@/lib/hooks/use-activity-logs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import {
  X,
  SlidersHorizontal,
  ClipboardList,
  Play,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  ArrowRightLeft,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";

const ACTION_ICONS: Record<string, typeof Play> = {
  step_started: Play,
  step_completed: CheckCircle2,
  step_skipped: SkipForward,
  step_unskipped: RotateCcw,
  status_changed: ArrowRightLeft,
  converted_to_employee: UserCheck,
};

interface JobTimelineTabProps {
  jobId: string;
  organizationId: string;
}

export function JobTimelineTab({ jobId, organizationId }: JobTimelineTabProps) {
  const { logs, loading } = useActivityLogs(organizationId, {
    parentType: "job",
    parentId: jobId,
  });
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  if (loading) {
    return <p className="text-center py-12 text-sm text-muted-foreground">読み込み中...</p>;
  }

  const filtered = logs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    return true;
  });

  const actions = [...new Set(logs.map((l) => l.action))];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {actionFilter && (
            <Badge variant="secondary" className="shrink-0 gap-1">
              {actionFilter.replace(/_/g, " ")}
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionFilter(null);
                }}
                className="ml-0.5 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto py-2">
          <DropdownMenuItem className="py-2" onClick={() => setActionFilter(null)}>
            <span className={cn(!actionFilter && "font-medium")}>すべて</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem className="py-2" key={action} onClick={() => setActionFilter(action)}>
              <span className={cn(actionFilter === action && "font-medium")}>
                {action.replace(/_/g, " ")}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {logs.length === 0 ? "ログがありません" : "該当するログがありません"}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {filtered.map((log) => {
                const Icon = ACTION_ICONS[log.action] ?? ClipboardList;
                return (
                  <div key={log.id} className="relative flex gap-3 py-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.actor_name && (
                          <span className="text-sm font-semibold">{log.actor_name}</span>
                        )}
                        <span className="text-sm">{log.summary}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(log.created_at), "yyyy/MM/dd HH:mm")}
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
