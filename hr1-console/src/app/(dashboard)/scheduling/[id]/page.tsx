"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { DatetimeInput } from "@/components/ui/datetime-input";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { cn } from "@/lib/utils";
import { useSchedulingDetailPage } from "@/lib/hooks/use-scheduling-detail";
import { Calendar, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

const tabs = [
  { value: "detail", label: "面接詳細" },
  { value: "timeline", label: "ログ" },
  { value: "history", label: "編集ログ" },
];

const editTabs: EditPanelTab[] = [
  { value: "info", label: "面接情報" },
  { value: "slots", label: "候補日時" },
];

export default function SchedulingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const h = useSchedulingDetailPage();
  const [auditLogCount, setAuditLogCount] = useState<number | undefined>(undefined);
  const handleAuditLoaded = useCallback((count: number) => setAuditLogCount(count), []);

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
          tabs={tabs.map((tab) => ({
            ...tab,
            count:
              tab.value === "timeline"
                ? h.bookedApps.length
                : tab.value === "history"
                  ? auditLogCount
                  : undefined,
          }))}
          activeTab={h.activeTab}
          onTabChange={h.setActiveTab}
        />
      </StickyFilterBar>

      {(h.activeTab === "detail" || h.activeTab === "history") && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          {/* ===== 面接詳細タブ ===== */}
          {h.activeTab === "detail" && (
            <div className="space-y-6 max-w-3xl">
              {/* 面接情報セクション */}
              <section>
                <div className="rounded-lg bg-white border">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">面接情報</h2>
                    <Button variant="outline" size="sm" onClick={h.startEditing}>
                      編集
                    </Button>
                  </div>
                  <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">タイトル</span>
                      <span className="font-medium">{interview.title}</span>
                    </div>
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
                        {h.slots.filter((s) => s.application_id).length} / {h.slots.length} 予約済み
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">作成日</span>
                      <span>{format(new Date(interview.created_at), "yyyy/MM/dd")}</span>
                    </div>
                    {interview.notes && (
                      <div className="pt-3 border-t">
                        <p className="text-muted-foreground mb-1">備考</p>
                        <p className="whitespace-pre-wrap">{interview.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 候補日時セクション */}
              <section>
                <div className="rounded-lg bg-white border">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      候補日時
                      <span className="ml-1.5 text-xs font-normal">{h.slots.length}</span>
                    </h2>
                  </div>
                  {h.slots.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">候補日時がありません</p>
                  ) : (
                    <div>
                      {h.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center gap-3 px-5 py-4",
                            slot.is_selected && "bg-primary/5"
                          )}
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
                                予約済み：
                                {(() => {
                                  const app = slot.applications as unknown as {
                                    profiles?: { display_name: string | null; email: string };
                                  } | null;
                                  return (
                                    app?.profiles?.display_name ?? app?.profiles?.email ?? "不明"
                                  );
                                })()}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">空き</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            上限: {`${slot.max_applicants}名`}
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
                </div>
              </section>
            </div>
          )}

          {/* ===== 編集ログタブ ===== */}
          {h.activeTab === "history" && organization && (
            <AuditLogPanel
              organizationId={organization.id}
              tableName="interviews"
              recordId={id}
              refreshKey={h.auditRefreshKey}
              onLoaded={handleAuditLoaded}
            />
          )}
        </div>
      )}

      {/* ===== ログタブ（白背景・全幅） ===== */}
      {h.activeTab === "timeline" && (
        <>
          <div className="flex items-center h-12 bg-white border-b px-4 sm:px-6 md:px-8">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="名前・メールで検索"
              value={h.historySearch}
              onChange={(e) => h.setHistorySearch(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent h-12"
            />
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>応募者</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>予約日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = h.bookedApps.filter((app) => {
                    if (!h.historySearch) return true;
                    const q = h.historySearch.toLowerCase();
                    return (
                      app.applicantName.toLowerCase().includes(q) ||
                      app.applicantEmail.toLowerCase().includes(q)
                    );
                  });
                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {h.bookedApps.length === 0
                            ? "ログがありません"
                            : "該当するログがありません"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return filtered.map((app) => (
                    <TableRow key={app.slotId}>
                      <TableCell className="font-medium">{app.applicantName}</TableCell>
                      <TableCell className="text-muted-foreground">{app.applicantEmail}</TableCell>
                      <TableCell>
                        {format(new Date(app.startAt), "yyyy/MM/dd HH:mm")}
                        {" 〜 "}
                        {format(new Date(app.endAt), "HH:mm")}
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </>
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
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={h.editTitle}
                onChange={(e) => h.setEditTitle(e.target.value)}
                placeholder="一次面接"
              />
            </div>
            <div className="space-y-2">
              <Label>場所</Label>
              <Input
                value={h.editLocation}
                onChange={(e) => h.setEditLocation(e.target.value)}
                placeholder="オンライン (Google Meet)"
              />
            </div>
            <div className="space-y-2">
              <Label>備考</Label>
              <Textarea
                value={h.editNotes}
                onChange={(e) => h.setEditNotes(e.target.value)}
                placeholder="面接に関する備考"
                rows={3}
              />
            </div>
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
