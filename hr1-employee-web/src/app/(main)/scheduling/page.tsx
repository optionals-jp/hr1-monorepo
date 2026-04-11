"use client";

import { useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { DatetimeInput } from "@/components/ui/datetime-input";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useSchedulingList, useCreateInterview } from "@/features/recruiting/hooks/use-scheduling";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
} from "@/lib/constants";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";

export default function SchedulingPage() {
  const router = useRouter();
  const { data: interviews = [], isLoading, error: interviewsError, mutate } = useSchedulingList();
  const [dialogOpen, setDialogOpen] = useState(false);

  const create = useCreateInterview();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="日程調整"
        description="面接の日程管理"
        sticky={false}
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            面接を作成
          </Button>
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

      <EditPanel
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            create.setNewTitle("");
            create.setNewLocation("");
            create.setNewNotes("");
          }
        }}
        title="面接を作成"
        onSave={async () => {
          await create.handleCreate();
          setDialogOpen(false);
        }}
        saving={create.saving}
        saveDisabled={!create.newTitle.trim()}
        saveLabel="作成する"
      >
        <div className="space-y-4">
          <FormInput
            label="タイトル"
            required
            value={create.newTitle}
            onChange={(e) => create.setNewTitle(e.target.value)}
            placeholder="一次面接"
          />
          <FormInput
            label="場所"
            value={create.newLocation}
            onChange={(e) => create.setNewLocation(e.target.value)}
            placeholder="オンライン (Google Meet)"
          />
          <FormTextarea
            label="備考"
            value={create.newNotes}
            onChange={(e) => create.setNewNotes(e.target.value)}
            placeholder="面接に関する備考"
            rows={3}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">候補日時</span>
              <Button variant="outline" size="xs" onClick={create.addSlot}>
                追加
              </Button>
            </div>
            {create.slots.map((slot, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <DatetimeInput
                    value={slot.startAt}
                    onChange={(v) => create.updateSlot(index, "startAt", v)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground shrink-0">〜</span>
                  <DatetimeInput
                    value={slot.endAt}
                    onChange={(v) => create.updateSlot(index, "endAt", v)}
                    className="flex-1"
                    minDateTime={slot.startAt}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => create.removeSlot(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-muted-foreground shrink-0">応募上限</span>
                  <Input
                    type="number"
                    min={1}
                    value={slot.maxApplicants}
                    onChange={(e) =>
                      create.updateSlot(
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
            {create.slots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">
                候補日時を追加してください
              </p>
            )}
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
