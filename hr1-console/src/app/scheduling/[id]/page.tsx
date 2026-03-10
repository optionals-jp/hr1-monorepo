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
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Interview, InterviewSlot, InterviewChangeLog } from "@/types/database";
import { Calendar, Plus, Trash2, Pencil, Search } from "lucide-react";
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

const changeTypeLabels: Record<string, string> = {
  created: "作成",
  title_updated: "タイトル変更",
  location_updated: "場所変更",
  notes_updated: "備考変更",
  status_updated: "ステータス変更",
  slot_added: "候補日時追加",
  slot_updated: "候補日時変更",
  slot_deleted: "候補日時削除",
};

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
  const [interview, setInterview] = useState<Interview | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [changeLogs, setChangeLogs] = useState<InterviewChangeLog[]>([]);
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
  const [editSlots, setEditSlots] = useState<{ id: string; startAt: string; endAt: string; isNew?: boolean; applicationId?: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: logsData }] = await Promise.all([
      supabase
        .from("interviews")
        .select(
          "*, interview_slots(*, applications:application_id(id, profiles:applicant_id(display_name, email)))"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("interview_change_logs")
        .select("*")
        .eq("interview_id", id)
        .order("created_at", { ascending: false }),
    ]);

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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status: string) => {
    const oldStatus = interview?.status;
    await supabase.from("interviews").update({ status }).eq("id", id);
    setInterview((prev) => (prev ? { ...prev, status: status as Interview["status"] } : prev));

    // Log status change
    if (oldStatus && oldStatus !== status) {
      await supabase.from("interview_change_logs").insert({
        id: `log-${id}-${Date.now()}`,
        interview_id: id,
        change_type: "status_updated",
        summary: `ステータスを「${statusLabels[oldStatus]}」から「${statusLabels[status]}」に変更`,
        details: { old: oldStatus, new: status },
      });
      const { data: logsData } = await supabase
        .from("interview_change_logs")
        .select("*")
        .eq("interview_id", id)
        .order("created_at", { ascending: false });
      setChangeLogs(logsData ?? []);
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
        applicationId: s.application_id,
      }))
    );
    setEditTab("info");
    setEditing(true);
  }

  function addSlot() {
    setEditSlots([
      ...editSlots,
      { id: `new-${Date.now()}`, startAt: "", endAt: "", isNew: true },
    ]);
  }

  function removeSlot(slotId: string) {
    setEditSlots(editSlots.filter((s) => s.id !== slotId));
  }

  function updateSlot(slotId: string, field: "startAt" | "endAt", value: string) {
    setEditSlots(editSlots.map((s) => (s.id === slotId ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    if (!interview) return;
    setSaving(true);

    const logs: { change_type: string; summary: string; details?: Record<string, unknown> }[] = [];

    // Info changes
    if (editTitle !== interview.title) {
      logs.push({
        change_type: "title_updated",
        summary: `タイトルを「${interview.title}」から「${editTitle}」に変更`,
        details: { old: interview.title, new: editTitle },
      });
    }
    if (editLocation !== (interview.location ?? "")) {
      logs.push({ change_type: "location_updated", summary: "場所を変更" });
    }
    if (editNotes !== (interview.notes ?? "")) {
      logs.push({ change_type: "notes_updated", summary: "備考を変更" });
    }

    await supabase
      .from("interviews")
      .update({
        title: editTitle,
        location: editLocation || null,
        notes: editNotes || null,
      })
      .eq("id", interview.id);

    // Slot changes
    const existingIds = slots.map((s) => s.id);
    const editIds = editSlots.filter((s) => !s.isNew).map((s) => s.id);

    const deletedIds = existingIds.filter((sid) => !editIds.includes(sid));
    const deletableIds = deletedIds.filter((sid) => {
      const slot = slots.find((s) => s.id === sid);
      return !slot?.application_id;
    });
    if (deletableIds.length > 0) {
      await supabase.from("interview_slots").delete().in("id", deletableIds);
      logs.push({ change_type: "slot_deleted", summary: `候補日時を${deletableIds.length}件削除` });
    }

    const newSlots = editSlots.filter((s) => s.isNew && s.startAt && s.endAt);
    if (newSlots.length > 0) {
      await supabase.from("interview_slots").insert(
        newSlots.map((s, i) => ({
          id: `slot-${interview.id}-${Date.now()}-${i}`,
          interview_id: interview.id,
          start_at: new Date(s.startAt).toISOString(),
          end_at: new Date(s.endAt).toISOString(),
          is_selected: false,
        }))
      );
      logs.push({ change_type: "slot_added", summary: `候補日時を${newSlots.length}件追加` });
    }

    let updatedCount = 0;
    for (const es of editSlots.filter((s) => !s.isNew)) {
      const original = slots.find((s) => s.id === es.id);
      if (!original || original.application_id) continue;
      const origStart = toLocalDatetime(original.start_at);
      const origEnd = toLocalDatetime(original.end_at);
      if (es.startAt !== origStart || es.endAt !== origEnd) {
        await supabase
          .from("interview_slots")
          .update({
            start_at: new Date(es.startAt).toISOString(),
            end_at: new Date(es.endAt).toISOString(),
          })
          .eq("id", es.id);
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      logs.push({ change_type: "slot_updated", summary: `候補日時を${updatedCount}件変更` });
    }

    if (logs.length > 0) {
      await supabase.from("interview_change_logs").insert(
        logs.map((log, i) => ({
          id: `log-${interview.id}-${Date.now()}-${i}`,
          interview_id: interview.id,
          change_type: log.change_type,
          summary: log.summary,
        }))
      );
    }

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

      <div className="sticky top-0 z-10 bg-white">
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
                    <Pencil className="mr-1 h-4 w-4" />
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
                  <div key={log.id} className="flex items-start gap-4 py-3 border-b last:border-0">
                    <div className="shrink-0 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {changeTypeLabels[log.change_type] ?? log.change_type}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.summary}</p>
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
                          {bookedApps.length === 0 ? "履歴がありません" : "該当する履歴がありません"}
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
              <div key={slot.id} className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={slot.startAt}
                  onChange={(e) => updateSlot(slot.id, "startAt", e.target.value)}
                  className="flex-1"
                  disabled={!!slot.applicationId}
                />
                <span className="text-muted-foreground shrink-0">〜</span>
                <Input
                  type="datetime-local"
                  value={slot.endAt}
                  onChange={(e) => updateSlot(slot.id, "endAt", e.target.value)}
                  className="flex-1"
                  disabled={!!slot.applicationId}
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
            ))}
            <Button variant="outline" onClick={addSlot} className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              候補日時を追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
