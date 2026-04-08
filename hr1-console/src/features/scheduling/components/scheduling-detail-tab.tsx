"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { DetailField } from "@hr1/shared-ui/components/ui/detail-field";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
} from "@/lib/constants";
import type { Interview } from "@/types/database";

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
  application_id: string | null;
  is_selected: boolean;
  max_applicants: number;
  applications?: unknown;
}

interface SchedulingDetailTabProps {
  interview: Interview;
  slots: Slot[];
  onEdit: () => void;
}

export function SchedulingDetailTab({ interview, slots, onEdit }: SchedulingDetailTabProps) {
  const bookedCount = slots.filter((s) => s.application_id).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">面接情報</h2>
          <Button variant="outline" size="xs" onClick={onEdit}>
            編集
          </Button>
        </div>
        <div className="space-y-4">
          <DetailField label="タイトル">{interview.title}</DetailField>
          <DetailField label="場所">{interview.location ?? "-"}</DetailField>
          <DetailField label="ステータス">
            <Badge variant={statusColors[interview.status]}>{statusLabels[interview.status]}</Badge>
          </DetailField>
          <DetailField label="予約状況">
            {bookedCount} / {slots.length} 予約済み
          </DetailField>
          <DetailField label="作成日">
            {format(new Date(interview.created_at), "yyyy/MM/dd")}
          </DetailField>
        </div>
        {interview.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              備考
            </p>
            <p className="text-sm whitespace-pre-wrap">{interview.notes}</p>
          </div>
        )}
      </SectionCard>

      <div className="lg:col-span-2">
        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">
            候補日時
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{slots.length}</span>
          </h2>
          {slots.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">候補日時がありません</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl bg-white border",
                    slot.is_selected && "border-primary/30 bg-primary/5"
                  )}
                >
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(slot.start_at), "yyyy/MM/dd HH:mm")}
                      {" 〜 "}
                      {format(new Date(slot.end_at), "HH:mm")}
                    </p>
                    {slot.application_id ? (
                      <p className="text-xs text-primary font-medium">
                        予約済み：
                        {(() => {
                          const app = slot.applications as unknown as {
                            profiles?: { display_name: string | null; email: string };
                          } | null;
                          return app?.profiles?.display_name ?? app?.profiles?.email ?? "不明";
                        })()}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">空き</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    上限: {slot.max_applicants}名
                  </span>
                  {!slot.application_id && interview.status !== "completed" && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      空き枠
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
