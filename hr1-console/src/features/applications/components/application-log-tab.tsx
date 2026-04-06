"use client";

import { useEffect, useState } from "react";
import type { ActivityLog } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase/browser";
import * as activityLogRepo from "@/lib/repositories/activity-log-repository";
import { format } from "date-fns";
import {
  Play,
  CheckCircle2,
  SkipForward,
  ClipboardList,
  RotateCcw,
  ArrowRightLeft,
  UserCheck,
} from "lucide-react";

interface ApplicationLogTabProps {
  applicationId: string;
  organizationId: string;
}

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Play; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  step_started: { icon: Play, variant: "default" },
  step_completed: { icon: CheckCircle2, variant: "secondary" },
  step_skipped: { icon: SkipForward, variant: "outline" },
  step_unskipped: { icon: RotateCcw, variant: "outline" },
  status_changed: { icon: ArrowRightLeft, variant: "default" },
  converted_to_employee: { icon: UserCheck, variant: "secondary" },
};

export function ApplicationLogTab({ applicationId, organizationId }: ApplicationLogTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await activityLogRepo.fetchActivityLogs(getSupabase(), organizationId, {
          targetType: "application",
          targetId: applicationId,
        });
        if (!cancelled) setLogs(data);
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, organizationId]);

  if (loading) {
    return <p className="text-center py-12 text-sm text-muted-foreground">読み込み中...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-center py-12 text-sm text-muted-foreground">まだログがありません</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-0">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] ?? {
              icon: ClipboardList,
              variant: "default" as const,
            };
            const Icon = config.icon;

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
                    <Badge variant={config.variant} className="text-xs">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
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
    </div>
  );
}
