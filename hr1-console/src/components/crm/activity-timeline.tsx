"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { activityTypeLabels } from "@/lib/constants";
import { Phone, Mail, MapPin, FileText, MessageSquare, Calendar } from "lucide-react";
import type { BcActivity } from "@/types/database";

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  visit: MapPin,
  memo: FileText,
  appointment: Calendar,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-500",
  email: "bg-green-500",
  visit: "bg-orange-500",
  memo: "bg-gray-400",
  appointment: "bg-purple-500",
};

interface ActivityTimelineProps {
  activities: BcActivity[];
  emptyMessage?: string;
}

export function ActivityTimeline({
  activities,
  emptyMessage = "活動履歴なし — 下のバーから記録を残しましょう",
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="relative">
      {/* 縦線 */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {activities.map((a) => {
          const Icon = ACTIVITY_ICONS[a.activity_type] ?? MessageSquare;
          const colorClass = ACTIVITY_COLORS[a.activity_type] ?? "bg-gray-400";
          const label = activityTypeLabels[a.activity_type] ?? a.activity_type;
          const date = new Date(a.activity_date ?? a.created_at);
          const authorName = a.profiles?.display_name ?? a.profiles?.email ?? null;
          const initial = (authorName ?? "?")[0].toUpperCase();

          return (
            <div key={a.id} className="relative flex items-start gap-3 py-3">
              {/* アイコン */}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="size-3.5 text-white" />
              </div>

              {/* 本文 */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {authorName && (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-medium">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold">{authorName}</span>
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleString("ja-JP")}
                  </span>
                </div>
                {a.title !== label && <p className="text-sm mt-0.5">{a.title}</p>}
                {a.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
