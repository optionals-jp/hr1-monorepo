"use client";

import type { ApplicationStep } from "@/types/database";
import { format } from "date-fns";

interface ApplicationHistoryTabProps {
  steps: ApplicationStep[];
}

export function ApplicationHistoryTab({ steps }: ApplicationHistoryTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <section>
        <div className="rounded-lg bg-white border">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">選考履歴</h2>
          </div>
          <div className="px-5 py-4">
            <StepHistory steps={steps} />
          </div>
        </div>
      </section>
    </div>
  );
}

/** ステップの履歴タイムライン */
function StepHistory({ steps }: { steps: ApplicationStep[] }) {
  // 各ステップの started_at / completed_at からイベントを生成
  const events: { date: string; label: string; stepLabel: string; type: string }[] = [];

  for (const step of steps) {
    if (step.started_at) {
      events.push({
        date: step.started_at,
        label: step.status === "skipped" ? "スキップ" : "開始",
        stepLabel: step.label,
        type: step.status === "skipped" ? "skipped" : "started",
      });
    }
    if (step.completed_at && step.status === "completed") {
      events.push({
        date: step.completed_at,
        label: "完了",
        stepLabel: step.label,
        type: "completed",
      });
    }
    if (step.completed_at && step.status === "skipped") {
      events.push({
        date: step.completed_at,
        label: "スキップ",
        stepLabel: step.label,
        type: "skipped",
      });
    }
  }

  // 日時の新しい順にソート
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">まだ履歴がありません</p>;
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, i) => (
        <div key={`${event.date}-${event.stepLabel}-${event.type}`} className="flex gap-3 pb-4">
          {/* タイムラインの線とドット */}
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full shrink-0 mt-1 ${
                event.type === "completed"
                  ? "bg-green-500"
                  : event.type === "skipped"
                    ? "bg-orange-400"
                    : "bg-primary"
              }`}
            />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          {/* 内容 */}
          <div className="pb-2">
            <p className="text-sm font-medium">
              {event.stepLabel}
              <span className="ml-2 text-muted-foreground font-normal">— {event.label}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.date), "yyyy/MM/dd HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
