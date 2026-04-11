"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { DatetimeInput } from "@/components/ui/datetime-input";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import {
  useSchedulingDetailPage,
  type SchedulingDetailTab as SchedulingDetailTabValue,
} from "@/features/recruiting/hooks/use-scheduling-detail";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Trash2, CalendarCheck, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { interviewScheduleStatusLabels as statusLabels } from "@/lib/constants";
import { SchedulingDetailTab } from "@/features/recruiting/components/scheduling-detail-tab";

const tabs = [
  { value: "detail", label: "面接詳細", icon: CalendarCheck },
  { value: "timeline", label: "ログ", icon: ScrollText },
];

const editTabs: EditPanelTab[] = [
  { value: "info", label: "面接情報" },
  { value: "slots", label: "候補日時" },
];

export default function SchedulingDetailPage() {
  const h = useSchedulingDetailPage();

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.interview) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        面接が見つかりません
      </div>
    );
  }

  const interview = h.interview;

  return (
    <>
      <PageHeader
        title={interview.title}
        description="面接詳細"
        breadcrumb={[{ label: "日程調整", href: "/scheduling" }]}
        sticky={false}
        action={
          <Select value={interview.status} onValueChange={(v) => v && h.updateStatus(v)}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
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

      <StickyFilterBar>
        <TabBar
          tabs={tabs}
          activeTab={h.activeTab}
          onTabChange={(v) => h.setActiveTab(v as SchedulingDetailTabValue)}
        />
      </StickyFilterBar>

      {h.activeTab === "detail" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <SchedulingDetailTab interview={interview} slots={h.slots} onEdit={h.startEditing} />
        </div>
      )}

      {h.activeTab === "timeline" && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
          {h.bookedApps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ログがありません</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-0">
                {h.bookedApps.map((app) => (
                  <div key={app.slotId} className="relative flex gap-3 py-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <CalendarCheck className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                              {app.applicantName[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold">{app.applicantName}</span>
                        </span>
                        <span className="text-sm">面接予約</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(app.startAt), "yyyy/MM/dd HH:mm")}
                          {" 〜 "}
                          {format(new Date(app.endAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="面接情報を編集"
        tabs={editTabs}
        activeTab={h.editTab}
        onTabChange={h.setEditTab}
        onSave={h.handleSave}
        saving={h.saving}
        saveDisabled={!h.editTitle}
      >
        {h.editTab === "info" && (
          <div className="space-y-4">
            <FormInput
              label="タイトル"
              required
              value={h.editTitle}
              onChange={(e) => h.setEditTitle(e.target.value)}
              placeholder="一次面接"
            />
            <FormInput
              label="場所"
              value={h.editLocation}
              onChange={(e) => h.setEditLocation(e.target.value)}
              placeholder="オンライン (Google Meet)"
            />
            <FormTextarea
              label="備考"
              value={h.editNotes}
              onChange={(e) => h.setEditNotes(e.target.value)}
              placeholder="面接に関する備考"
              rows={3}
            />
          </div>
        )}
        {h.editTab === "slots" && (
          <div className="space-y-3">
            {h.editSlots.map((slot) => (
              <div key={slot.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <DatetimeInput
                    value={slot.startAt}
                    onChange={(v) => h.updateSlot(slot.id, "startAt", v)}
                    className="flex-1"
                    disabled={!!slot.applicationId}
                  />
                  <span className="text-muted-foreground shrink-0">〜</span>
                  <DatetimeInput
                    value={slot.endAt}
                    onChange={(v) => h.updateSlot(slot.id, "endAt", v)}
                    className="flex-1"
                    disabled={!!slot.applicationId}
                    minDateTime={slot.startAt}
                  />
                  {slot.applicationId ? (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      予約済
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => h.removeSlot(slot.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {slot.isNew && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      新規
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-muted-foreground shrink-0">応募上限</span>
                  <Input
                    type="number"
                    min={1}
                    value={slot.maxApplicants}
                    onChange={(e) =>
                      h.updateSlot(
                        slot.id,
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
            <Button variant="outline" onClick={h.addSlot} className="w-full">
              候補日時を追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
