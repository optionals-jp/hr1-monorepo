"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import type { Interview, InterviewSlot } from "@/types/database";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  scheduling: "未確定",
  confirmed: "確定済み",
  completed: "完了",
  cancelled: "キャンセル",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduling: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export default function SchedulingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("interviews")
      .select("*, interview_slots(*, applications:application_id(id, profiles:applicant_id(display_name, email)))")
      .eq("id", id)
      .single();

    if (data) {
      const { interview_slots, ...rest } = data;
      setInterview(rest as Interview);
      setSlots(
        (interview_slots ?? []).sort(
          (a: InterviewSlot, b: InterviewSlot) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status: string) => {
    await supabase.from("interviews").update({ status }).eq("id", id);
    setInterview((prev) =>
      prev ? { ...prev, status: status as Interview["status"] } : prev
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        面接が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={interview.title}
        description="面接詳細"
        action={
          <Select
            value={interview.status}
            onValueChange={(v) => v && updateStatus(v)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduling">未確定</SelectItem>
              <SelectItem value="confirmed">確定済み</SelectItem>
              <SelectItem value="completed">完了</SelectItem>
              <SelectItem value="cancelled">キャンセル</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <PageContent>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>面接情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">場所</span>
              <span>{interview.location ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ステータス</span>
              <Badge variant={statusColors[interview.status]}>
                {statusLabels[interview.status]}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">枠の予約状況</span>
              <span>
                {slots.filter((s) => s.application_id).length} / {slots.length} 予約済み
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">作成日</span>
              <span>
                {format(new Date(interview.created_at), "yyyy/MM/dd")}
              </span>
            </div>
            {interview.notes && (
              <div className="pt-3 border-t">
                <p className="text-muted-foreground mb-1">備考</p>
                <p className="whitespace-pre-wrap">{interview.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>候補日時</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                候補日時がありません
              </p>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`flex items-center gap-3 rounded-lg border p-4 ${
                    slot.is_selected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {format(new Date(slot.start_at), "yyyy/MM/dd HH:mm")}
                      {" 〜 "}
                      {format(new Date(slot.end_at), "HH:mm")}
                    </p>
                    {slot.application_id ? (
                      <p className="text-xs text-primary font-medium">
                        予約済み：{(() => {
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
                  {!slot.application_id && interview.status !== "completed" && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      空き枠
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      </PageContent>
    </>
  );
}
