"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { cn, autoFillEndAt } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import {
  loadSchedulingDetail,
  updateInterviewStatus as updateStatusAction,
  fetchSchedulingAuditLogs,
  saveSchedulingDetail,
} from "@/lib/hooks/use-scheduling-detail";
import type { Interview, InterviewSlot, AuditLog } from "@/types/database";
import { Calendar, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import {
  interviewScheduleStatusLabels as statusLabels,
  interviewScheduleStatusColors as statusColors,
  getAuditActionLabel,
} from "@/lib/constants";

const tabs = [
  { value: "detail", label: "面接詳細" },
  { value: "timeline", label: "履歴" },
  { value: "history", label: "編集履歴" },
];

const editTabs: EditPanelTab[] = [
  { value: "info", label: "面接情報" },
  { value: "slots", label: "候補日時" },
];

// datetime-local用のフォーマット (yyyy-MM-ddTHH:mm)
function toLocalDatetime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface BookedApplication {
  slotId: string;
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  startAt: string;
  endAt: string;
}

export default function SchedulingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [changeLogs, setChangeLogs] = useState<AuditLog[]>([]);
  const [bookedApps, setBookedApps] = useState<BookedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("detail");

  const [historySearch, setHistorySearch] = useState("");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("info");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSlots, setEditSlots] = useState<
    {
      id: string;
      startAt: string;
      endAt: string;
      maxApplicants: number;
      isNew?: boolean;
      applicationId?: string | null;
    }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { data, logsData } = await loadSchedulingDetail(id, organization.id);

    if (data) {
      const { interview_slots, ...rest } = data;
      setInterview(rest as Interview);
      const sortedSlots = (interview_slots ?? []).sort(
        (a: InterviewSlot, b: InterviewSlot) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      setSlots(sortedSlots);

      // Extract booked applications
      const apps: BookedApplication[] = [];
      for (const slot of sortedSlots) {
        if (slot.application_id) {
          const app = slot.applications as unknown as {
            id: string;
            profiles?: { display_name: string | null; email: string };
          } | null;
          apps.push({
            slotId: slot.id,
            applicationId: slot.application_id,
            applicantName: app?.profiles?.display_name ?? "-",
            applicantEmail: app?.profiles?.email ?? "-",
            startAt: slot.start_at,
            endAt: slot.end_at,
          });
        }
      }
      setBookedApps(apps);
    }
    setChangeLogs(logsData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const updateStatus = async (status: string) => {
    if (!organization) return;
    const oldStatus = interview?.status;
    await updateStatusAction(id, organization.id, status);
    setInterview((prev) => (prev ? { ...prev, status: status as Interview["status"] } : prev));

    if (oldStatus && oldStatus !== status) {
      const logs = await fetchSchedulingAuditLogs(organization.id, id);
      setChangeLogs(logs);
    }
  };

  function startEditing() {
    if (!interview) return;
    setEditTitle(interview.title);
    setEditLocation(interview.location ?? "");
    setEditNotes(interview.notes ?? "");
    setEditSlots(
      slots.map((s) => ({
        id: s.id,
        startAt: toLocalDatetime(s.start_at),
        endAt: toLocalDatetime(s.end_at),
        maxApplicants: Math.max(1, s.max_applicants ?? 1),
        applicationId: s.application_id,
      }))
    );
    setEditTab("info");
    setEditing(true);
  }

  function addSlot() {
    setEditSlots([
      ...editSlots,
      { id: `new-${Date.now()}`, startAt: "", endAt: "", maxApplicants: 1, isNew: true },
    ]);
  }

  function removeSlot(slotId: string) {
    setEditSlots(editSlots.filter((s) => s.id !== slotId));
  }

  function updateSlot(
    slotId: string,
    field: "startAt" | "endAt" | "maxApplicants",
    value: string | number
  ) {
    setEditSlots(
      editSlots.map((s) => {
        if (s.id !== slotId) return s;
        const updated = { ...s, [field]: value };
        // 開始日時が設定され、終了日時が未設定なら30分後を自動入力
        if (field === "startAt" && value && !s.endAt) {
          updated.endAt = autoFillEndAt(value as string);
        }
        return updated;
      })
    );
  }

  async function handleSave() {
    if (!interview || !organization) return;
    setSaving(true);

    await saveSchedulingDetail({
      interviewId: interview.id,
      organizationId: organization.id,
      title: editTitle,
      location: editLocation || null,
      notes: editNotes || null,
      existingSlots: slots,
      editSlots,
      toLocalDatetime,
    });

    setSaving(false);
    setEditing(false);
    await load();
  }

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
        breadcrumb={[{ label: "日程調整", href: "/scheduling" }]}
        sticky={false}
        action={
          <Select value={interview.status} onValueChange={(v) => v && updateStatus(v)}>
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

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count =
              tab.value === "timeline"
                ? bookedApps.length
                : tab.value === "history"
                  ? changeLogs.length
                  : undefined;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                  activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                )}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(activeTab === "detail" || activeTab === "history") && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          {/* ===== 面接詳細タブ ===== */}
          {activeTab === "detail" && (
            <div className="space-y-6 max-w-3xl">
              {/* 面接情報セクション */}
              <section>
                <div className="rounded-lg bg-white border">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">面接情報</h2>
                    <Button variant="outline" size="sm" onClick={startEditing}>
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
                        {slots.filter((s) => s.application_id).length} / {slots.length} 予約済み
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
                      <span className="ml-1.5 text-xs font-normal">{slots.length}</span>
                    </h2>
                  </div>
                  {slots.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">候補日時がありません</p>
                  ) : (
                    <div>
                      {slots.map((slot) => (
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

          {/* ===== 編集履歴タブ ===== */}
          {activeTab === "history" && (
            <>
              {changeLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">編集履歴がありません</p>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {changeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 py-3 border-b last:border-0"
                    >
                      <div className="shrink-0 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {getAuditActionLabel(log)}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {(log.metadata as Record<string, string> | null)?.summary ??
                            (log.changes as Record<string, string> | null)?.summary ??
                            log.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(log.created_at), "yyyy/MM/dd HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 履歴タブ（白背景・全幅） ===== */}
      {activeTab === "timeline" && (
        <>
          <div className="flex items-center h-12 bg-white border-b px-4 sm:px-6 md:px-8">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="名前・メールで検索"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
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
                  const filtered = bookedApps.filter((app) => {
                    if (!historySearch) return true;
                    const q = historySearch.toLowerCase();
                    return (
                      app.applicantName.toLowerCase().includes(q) ||
                      app.applicantEmail.toLowerCase().includes(q)
                    );
                  });
                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {bookedApps.length === 0
                            ? "履歴がありません"
                            : "該当する履歴がありません"}
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
        open={editing}
        onOpenChange={setEditing}
        title="面接情報を編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!editTitle}
      >
        {editTab === "info" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="一次面接"
              />
            </div>
            <div className="space-y-2">
              <Label>場所</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="オンライン (Google Meet)"
              />
            </div>
            <div className="space-y-2">
              <Label>備考</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="面接に関する備考"
                rows={3}
              />
            </div>
          </div>
        )}
        {editTab === "slots" && (
          <div className="space-y-3">
            {editSlots.map((slot) => (
              <div key={slot.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <DatetimeInput
                    value={slot.startAt}
                    onChange={(v) => updateSlot(slot.id, "startAt", v)}
                    className="flex-1"
                    disabled={!!slot.applicationId}
                  />
                  <span className="text-muted-foreground shrink-0">〜</span>
                  <DatetimeInput
                    value={slot.endAt}
                    onChange={(v) => updateSlot(slot.id, "endAt", v)}
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
                      onClick={() => removeSlot(slot.id)}
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
                      updateSlot(
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
            <Button variant="outline" onClick={addSlot} className="w-full">
              候補日時を追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
