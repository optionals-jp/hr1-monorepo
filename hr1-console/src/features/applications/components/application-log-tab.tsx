"use client";

import type { ApplicationStep } from "@/types/database";
import { StepStatus } from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Play, CheckCircle2, SkipForward } from "lucide-react";

interface ApplicationLogTabProps {
  steps: ApplicationStep[];
}

function getEventStyle(type: string) {
  switch (type) {
    case "completed":
      return {
        icon: CheckCircle2,
        bg: "bg-green-500",
        text: "text-green-700",
        bgLight: "bg-green-50",
      };
    case "skipped":
      return {
        icon: SkipForward,
        bg: "bg-orange-400",
        text: "text-orange-700",
        bgLight: "bg-orange-50",
      };
    default:
      return { icon: Play, bg: "bg-blue-500", text: "text-blue-700", bgLight: "bg-blue-50" };
  }
}

export function ApplicationLogTab({ steps }: ApplicationLogTabProps) {
  const events: { date: string; label: string; stepLabel: string; type: string }[] = [];

  for (const step of steps) {
    if (step.started_at) {
      events.push({
        date: step.started_at,
        label: "開始",
        stepLabel: step.label,
        type: "started",
      });
    }
    if (step.completed_at && step.status === StepStatus.Completed) {
      events.push({
        date: step.completed_at,
        label: "完了",
        stepLabel: step.label,
        type: "completed",
      });
    }
    if (step.completed_at && step.status === StepStatus.Skipped) {
      events.push({
        date: step.completed_at,
        label: "スキップ",
        stepLabel: step.label,
        type: "skipped",
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return <p className="text-center py-12 text-sm text-muted-foreground">まだログがありません</p>;
  }

  return (
    <div className="max-w-3xl">
      <div className="relative">
        {events.map((event, i) => {
          const style = getEventStyle(event.type);
          const Icon = style.icon;
          const isLast = i === events.length - 1;
          const dateObj = new Date(event.date);

          return (
            <div
              key={`${event.date}-${event.stepLabel}-${event.type}`}
              className="relative flex gap-3 pb-0"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.bg}`}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
              </div>

              <div className={`flex-1 pb-5 ${isLast ? "" : "min-h-14"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm leading-6">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${style.bgLight} ${style.text} mr-1.5`}
                    >
                      {event.label}
                    </span>
                    <span className="text-foreground">{event.stepLabel}</span>
                  </p>
                  <time
                    className="shrink-0 text-xs text-muted-foreground whitespace-nowrap"
                    title={format(dateObj, "yyyy/MM/dd HH:mm:ss")}
                  >
                    {formatDistanceToNow(dateObj, { addSuffix: true, locale: ja })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
