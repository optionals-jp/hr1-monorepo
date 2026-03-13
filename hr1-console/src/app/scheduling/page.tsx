"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Interview, InterviewSlot } from "@/types/database";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function SchedulingPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>([]);

  const {
    data: interviews = [],
    isLoading,
    mutate,
  } = useQuery<(Interview & { interview_slots: InterviewSlot[] })[]>(
    organization ? `interviews-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("interviews")
        .select("*, interview_slots(*)")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });

      return data ?? [];
    }
  );

  const addSlot = () => {
    setSlots([...slots, { startAt: "", endAt: "" }]);
  };

  const updateSlot = (index: number, field: "startAt" | "endAt", value: string) => {
    const updated = [...slots];
    updated[index][field] = value;
    setSlots(updated);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!organization || !newTitle) return;

    const interviewId = `interview-${Date.now()}`;

    await getSupabase()
      .from("interviews")
      .insert({
        id: interviewId,
        organization_id: organization.id,
        title: newTitle,
        location: newLocation || null,
        notes: newNotes || null,
        status: "scheduling",
      });

    if (slots.length > 0) {
      const validSlots = slots.filter((s) => s.startAt && s.endAt);
      if (validSlots.length > 0) {
        await getSupabase()
          .from("interview_slots")
          .insert(
            validSlots.map((slot, i) => ({
              id: `slot-${interviewId}-${i + 1}`,
              interview_id: interviewId,
              start_at: new Date(slot.startAt).toISOString(),
              end_at: new Date(slot.endAt).toISOString(),
              is_selected: false,
            }))
          );
      }
    }

    setNewTitle("");
    setNewLocation("");
    setNewNotes("");
    setSlots([]);
    setDialogOpen(false);
    mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="日程調整"
        description="面接の日程管理"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>面接を作成</DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>面接を作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>タイトル *</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="一次面接"
                  />
                </div>
                <div className="space-y-2">
                  <Label>場所</Label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="オンライン (Google Meet)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>備考</Label>
                  <Textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="面接に関する備考"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>候補日時</Label>
                    <Button variant="outline" size="sm" onClick={addSlot}>
                      追加
                    </Button>
                  </div>
                  {slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        value={slot.startAt}
                        onChange={(e) => updateSlot(index, "startAt", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">〜</span>
                      <Input
                        type="datetime-local"
                        value={slot.endAt}
                        onChange={(e) => updateSlot(index, "endAt", e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeSlot(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button onClick={handleCreate} className="w-full" disabled={!newTitle}>
                  作成する
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>場所</TableHead>
              <TableHead>予約状況</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : interviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  面接がありません
                </TableCell>
              </TableRow>
            ) : (
              interviews.map((interview) => {
                const totalSlots = interview.interview_slots?.length ?? 0;
                const bookedSlots =
                  interview.interview_slots?.filter((s) => s.application_id).length ?? 0;
                return (
                  <TableRow
                    key={interview.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/scheduling/${interview.id}`)}
                  >
                    <TableCell className="font-medium">{interview.title}</TableCell>
                    <TableCell>{interview.location ?? "-"}</TableCell>
                    <TableCell>
                      {bookedSlots} / {totalSlots} 枠
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[interview.status]}>
                        {statusLabels[interview.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
