"use client";

import { useMemo, useState } from "react";
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
import { useEmployees } from "@/lib/hooks/use-employees";
import { InterviewerSelect } from "@/features/recruiting/components/interviewer-select";
import {
  Trash2,
  LayoutList,
  Clock,
  CircleCheck,
  CheckCircle2,
  CircleX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
} from "@/lib/constants";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@hr1/shared-ui/lib/utils";

const statusTabs = [
  { value: "all", label: "すべて", icon: LayoutList },
  { value: "scheduling", label: "未確定", icon: Clock },
  { value: "confirmed", label: "確定済み", icon: CircleCheck },
  { value: "completed", label: "完了", icon: CheckCircle2 },
  { value: "cancelled", label: "キャンセル", icon: CircleX },
];

type SlotAvailability = "all" | "available" | "full" | "empty";

const slotAvailabilityLabels: Record<SlotAvailability, string> = {
  all: "すべて",
  available: "空きあり",
  full: "満員",
  empty: "枠未設定",
};

export default function SchedulingPage() {
  const router = useRouter();
  const { data: interviews = [], isLoading, error: interviewsError, mutate } = useSchedulingList();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<SlotAvailability>("all");

  const create = useCreateInterview();
  const { data: employees = [] } = useEmployees();

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return interviews.filter((interview) => {
      if (statusFilter !== "all" && interview.status !== statusFilter) return false;

      const totalSlots = interview.interview_slots?.length ?? 0;
      const bookedSlots = interview.interview_slots?.filter((s) => s.application_id).length ?? 0;
      if (slotFilter === "available" && !(totalSlots > 0 && bookedSlots < totalSlots)) return false;
      if (slotFilter === "full" && !(totalSlots > 0 && bookedSlots >= totalSlots)) return false;
      if (slotFilter === "empty" && totalSlots !== 0) return false;

      if (keyword) {
        const haystack = [interview.title, interview.location ?? "", interview.notes ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [interviews, search, statusFilter, slotFilter]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="日程調整"
        description="面接の日程管理"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            面接を作成
          </Button>
        }
      />

      <QueryErrorBanner error={interviewsError} onRetry={() => mutate()} />

      <StickyFilterBar>
        <TabBar tabs={statusTabs} activeTab={statusFilter} onTabChange={setStatusFilter} />
        <SearchBar value={search} onChange={setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {slotFilter !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  予約状況：{slotAvailabilityLabels[slotFilter]}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlotFilter("all");
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">予約状況</p>
            {(Object.keys(slotAvailabilityLabels) as SlotAvailability[]).map((key) => (
              <DropdownMenuItem key={key} className="py-2" onClick={() => setSlotFilter(key)}>
                <span className={cn(slotFilter === key && "font-medium")}>
                  {slotAvailabilityLabels[key]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

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
              isEmpty={filtered.length === 0}
              emptyMessage="面接がありません"
            >
              {filtered.map((interview) => {
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
        size="xl"
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

          <div className="space-y-1.5">
            <span className="text-sm font-medium">面接官</span>
            <InterviewerSelect
              employees={employees}
              selectedIds={create.selectedInterviewerIds}
              onSelectionChange={create.setSelectedInterviewerIds}
            />
          </div>

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
