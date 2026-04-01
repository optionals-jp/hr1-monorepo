"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DatetimeInput } from "@/components/ui/datetime-input";
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
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useSchedulingList, useCreateInterview } from "@/lib/hooks/use-scheduling";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
} from "@/lib/constants";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { TableSection } from "@/components/layout/table-section";

export default function SchedulingPage() {
  const router = useRouter();
  const { data: interviews = [], isLoading, error: interviewsError, mutate } = useSchedulingList();

  const {
    dialogOpen,
    setDialogOpen,
    newTitle,
    setNewTitle,
    newLocation,
    setNewLocation,
    newNotes,
    setNewNotes,
    slots,
    addSlot,
    updateSlot,
    removeSlot,
    handleCreate,
  } = useCreateInterview();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="日程調整"
        description="面接の日程管理"
        sticky={false}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>面接を作成</DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                    <div key={index} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DatetimeInput
                          value={slot.startAt}
                          onChange={(v) => updateSlot(index, "startAt", v)}
                          className="flex-1"
                        />
                        <span className="text-muted-foreground shrink-0">〜</span>
                        <DatetimeInput
                          value={slot.endAt}
                          onChange={(v) => updateSlot(index, "endAt", v)}
                          className="flex-1"
                          minDateTime={slot.startAt}
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeSlot(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {slot.startAt &&
                        slot.endAt &&
                        (new Date(slot.endAt).getTime() - new Date(slot.startAt).getTime()) /
                          (1000 * 60) >
                          180 && (
                          <p className="text-xs text-amber-600 pl-1">
                            ⚠ 面接枠が3時間以上あります。設定に誤りがないか確認してください。
                          </p>
                        )}
                      <div className="flex items-center gap-2 pl-1">
                        <span className="text-xs text-muted-foreground shrink-0">応募上限</span>
                        <Input
                          type="number"
                          min={1}
                          value={slot.maxApplicants}
                          onChange={(e) =>
                            updateSlot(
                              index,
                              "maxApplicants",
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-20 h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">名</span>
                      </div>
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

      <QueryErrorBanner error={interviewsError} onRetry={() => mutate()} />

      <TableSection>
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
            <TableEmptyState
              colSpan={4}
              isLoading={isLoading}
              isEmpty={interviews.length === 0}
              emptyMessage="面接がありません"
            >
              {interviews.map((interview) => {
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
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
