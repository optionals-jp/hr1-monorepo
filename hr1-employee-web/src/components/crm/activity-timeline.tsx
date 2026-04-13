"use client";

import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { activityTypeLabels } from "@/lib/constants";
import { ACTIVITY_ICONS, ACTIVITY_ICON_FALLBACK } from "@/components/crm/activity-icons";
import type { BcActivity } from "@/types/database";

interface ActivityTimelineProps {
  activities: BcActivity[];
  emptyMessage?: string;
}

export function ActivityTimeline({ activities, emptyMessage = "活動なし" }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="relative">
      {activities.length > 1 && (
        <div className="absolute left-4 top-7 bottom-7 w-px bg-border" />
      )}
      <div className="space-y-0">
        {activities.map((a) => {
          const Icon = ACTIVITY_ICONS[a.activity_type] ?? ACTIVITY_ICON_FALLBACK;
          const label = activityTypeLabels[a.activity_type] ?? a.activity_type;
          const date = new Date(a.activity_date ?? a.created_at);
          const authorName = a.profiles?.display_name ?? a.profiles?.email ?? null;

          return (
            <div key={a.id} className="relative flex gap-3 py-3">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {authorName && (
                    <span className="inline-flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                          {authorName[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold">{authorName}</span>
                    </span>
                  )}
                  <span className="text-sm">{a.title !== label ? a.title : label}</span>
                  <Badge variant="outline" className="text-xs">
                    {label}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {date.toLocaleString("ja-JP")}
                  </span>
                </div>
                {a.description && (
                  <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
