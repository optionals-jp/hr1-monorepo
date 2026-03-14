"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { getSupabase } from "@/lib/supabase";
import type { Job, JobStep, JobChangeLog, Application, Interview } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/ui/search-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, SlidersHorizontal, GripVertical } from "lucide-react";
import { format } from "date-fns";
import {
  stepTypeLabels,
  selectableStepTypes,
  jobStatusLabels as statusLabels,
  applicationStatusLabels as appStatusLabels,
  applicationStatusColors as appStatusColors,
  jobChangeTypeLabels as changeTypeLabels,
  stepStatusLabels,
} from "@/lib/constants";

interface HistoryEvent {
  id: string;
  applicantName: string;
  applicantEmail: string;
  eventType: string;
  label: string;
  status: string;
  date: string;
}

const tabs = [
  { value: "detail", label: "求人詳細" },
  { value: "applicants", label: "応募者" },
  { value: "timeline", label: "履歴" },
  { value: "history", label: "編集履歴" },
];

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "description", label: "説明" },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [changeLogs, setChangeLogs] = useState<JobChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("detail");

  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>("all");

  const [historySearch, setHistorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);

  // Step dialog (add)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStepType, setNewStepType] = useState("interview");
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepFormId, setNewStepFormId] = useState<string>("");
  const [newStepScheduleIds, setNewStepScheduleIds] = useState<string[]>([]);
  const [savingStep, setSavingStep] = useState(false);
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  // Step edit
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [editStepId, setEditStepId] = useState<string>("");
  const [editStepType, setEditStepType] = useState("interview");
  const [editStepLabel, setEditStepLabel] = useState("");
  const [editStepFormId, setEditStepFormId] = useState<string>("");
  const [editStepScheduleIds, setEditStepScheduleIds] = useState<string[]>([]);
  const [savingEditStep, setSavingEditStep] = useState(false);
  const [deletingEditStep, setDeletingEditStep] = useState(false);

  // Drag-and-drop reorder
  const [reorderMode, setReorderMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmingReorder, setConfirmingReorder] = useState(false);
  const stepsBeforeReorder = useRef<JobStep[]>([]);

  // Job info editing
  const [editingInfo, setEditingInfo] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editSalaryRange, setEditSalaryRange] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const [{ data: jobData }, { data: stepsData }, { data: appsData }, { data: logsData }] =
      await Promise.all([
        getSupabase()
          .from("jobs")
          .select("*")
          .eq("id", id)
          .eq("organization_id", organization.id)
          .single(),
        getSupabase().from("job_steps").select("*").eq("job_id", id).order("step_order"),
        getSupabase()
          .from("applications")
          .select("*, profiles:applicant_id(display_name, email), application_steps(*)")
          .eq("job_id", id)
          .order("applied_at", { ascending: false }),
        getSupabase()
          .from("job_change_logs")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: false }),
      ]);

    setJob(jobData);
    setSteps(stepsData ?? []);
    setApplications((appsData as Application[]) ?? []);
    setChangeLogs(logsData ?? []);

    // Build timeline events
    const events: HistoryEvent[] = [];
    for (const app of appsData ?? []) {
      const profile = app.profiles as unknown as {
        display_name: string | null;
        email: string;
      } | null;
      const name = profile?.display_name ?? "-";
      const email = profile?.email ?? "-";

      // Application event
      events.push({
        id: `app-${app.id}`,
        applicantName: name,
        applicantEmail: email,
        eventType: "応募",
        label: appStatusLabels[app.status] ?? app.status,
        status: app.status,
        date: app.applied_at,
      });

      // Step events
      for (const step of app.application_steps ?? []) {
        if (step.status !== "pending") {
          events.push({
            id: `step-${step.id}`,
            applicantName: name,
            applicantEmail: email,
            eventType: step.label,
            label: stepStatusLabels[step.status] ?? step.status,
            status: step.status,
            date: step.completed_at ?? app.applied_at,
          });
        }
      }
    }
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistoryEvents(events);

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    getSupabase()
      .from("custom_forms")
      .select("id, title")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setForms(data ?? []));
    getSupabase()
      .from("interviews")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInterviews((data as Interview[]) ?? []));
  }, [organization]);

  const updateJobStatus = async (status: string) => {
    const oldStatus = job?.status;
    await getSupabase().from("jobs").update({ status }).eq("id", id);
    setJob((prev) => (prev ? { ...prev, status: status as Job["status"] } : prev));

    if (oldStatus && oldStatus !== status) {
      await getSupabase()
        .from("job_change_logs")
        .insert({
          id: `log-${id}-${Date.now()}`,
          job_id: id,
          change_type: "status_updated",
          summary: `ステータスを「${statusLabels[oldStatus]}」から「${statusLabels[status]}」に変更`,
          details: { old: oldStatus, new: status },
        });
      const { data: logsData } = await getSupabase()
        .from("job_change_logs")
        .select("*")
        .eq("job_id", id)
        .order("created_at", { ascending: false });
      setChangeLogs(logsData ?? []);
    }
  };

  const addStep = async () => {
    if (!newStepLabel) return;
    setSavingStep(true);

    const nextOrder = steps.length + 1;
    const stepId = crypto.randomUUID();
    const relatedId =
      ["screening", "form"].includes(newStepType) && newStepFormId
        ? newStepFormId
        : newStepType === "interview" && newStepScheduleIds.length > 0
          ? newStepScheduleIds.join(",")
          : null;

    const { error } = await getSupabase().from("job_steps").insert({
      id: stepId,
      job_id: id,
      step_type: newStepType,
      step_order: nextOrder,
      label: newStepLabel,
      related_id: relatedId,
    });

    if (error) {
      setSavingStep(false);
      return;
    }

    await getSupabase()
      .from("job_change_logs")
      .insert({
        id: crypto.randomUUID(),
        job_id: id,
        change_type: "step_added",
        summary: `ステップ「${newStepLabel}」を追加`,
      });

    const newStep: JobStep = {
      id: stepId,
      job_id: id,
      step_type: newStepType,
      step_order: nextOrder,
      label: newStepLabel,
      related_id: relatedId,
    };

    setSteps((prev) => [...prev, newStep]);
    setSavingStep(false);
    setDialogOpen(false);
    setNewStepType("interview");
    setNewStepLabel("");
    setNewStepFormId("");
    setNewStepScheduleIds([]);
  };

  const removeStep = async (stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    await getSupabase().from("job_steps").delete().eq("id", stepId);

    if (step) {
      await getSupabase()
        .from("job_change_logs")
        .insert({
          id: `log-${id}-${Date.now()}-stepdel`,
          job_id: id,
          change_type: "step_deleted",
          summary: `ステップ「${step.label}」を削除`,
        });
    }

    load();
  };

  const reorderSteps = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newSteps = [...steps];
    const [moved] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, moved);
    setSteps(newSteps.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const confirmReorder = async () => {
    setConfirmingReorder(true);
    // UNIQUE(job_id, step_order) 制約のため、並列更新すると衝突する。
    // 一時値（1000+）に退避してから最終値を設定することで衝突を回避する。
    await Promise.all(
      steps.map((s) =>
        getSupabase()
          .from("job_steps")
          .update({ step_order: s.step_order + 1000 })
          .eq("id", s.id)
      )
    );
    await Promise.all(
      steps.map((s) =>
        getSupabase().from("job_steps").update({ step_order: s.step_order }).eq("id", s.id)
      )
    );
    setConfirmingReorder(false);
    setReorderMode(false);
  };

  const startEditStep = (step: JobStep) => {
    setEditStepId(step.id);
    setEditStepType(step.step_type);
    setEditStepLabel(step.label);
    if (step.step_type === "interview" && step.related_id) {
      setEditStepFormId("");
      setEditStepScheduleIds(step.related_id.split(",").filter(Boolean));
    } else {
      setEditStepFormId(step.related_id ?? "");
      setEditStepScheduleIds([]);
    }
    setEditStepOpen(true);
  };

  const saveEditStep = async () => {
    if (!editStepLabel) return;
    setSavingEditStep(true);
    const relatedId =
      ["screening", "form"].includes(editStepType) && editStepFormId
        ? editStepFormId
        : editStepType === "interview" && editStepScheduleIds.length > 0
          ? editStepScheduleIds.join(",")
          : null;
    await getSupabase()
      .from("job_steps")
      .update({ step_type: editStepType, label: editStepLabel, related_id: relatedId })
      .eq("id", editStepId);
    setSteps((prev) =>
      prev.map((s) =>
        s.id === editStepId
          ? { ...s, step_type: editStepType, label: editStepLabel, related_id: relatedId }
          : s
      )
    );
    setSavingEditStep(false);
    setEditStepOpen(false);
  };

  const deleteEditStep = async () => {
    setDeletingEditStep(true);
    await removeStep(editStepId);
    setDeletingEditStep(false);
    setEditStepOpen(false);
  };

  // === Info editing ===
  function startEditingInfo() {
    if (!job) return;
    setEditTitle(job.title);
    setEditDescription(job.description ?? "");
    setEditDepartment(job.department ?? "");
    setEditLocation(job.location ?? "");
    setEditEmploymentType(job.employment_type ?? "");
    setEditSalaryRange(job.salary_range ?? "");
    setEditTab("basic");
    setEditingInfo(true);
  }

  async function saveInfo() {
    if (!job) return;
    setSavingInfo(true);

    const logs: { change_type: string; summary: string; details?: Record<string, unknown> }[] = [];

    if (editTitle !== job.title) {
      logs.push({
        change_type: "title_updated",
        summary: `タイトルを「${job.title}」から「${editTitle}」に変更`,
        details: { old: job.title, new: editTitle },
      });
    }
    if (editDescription !== (job.description ?? "")) {
      logs.push({ change_type: "description_updated", summary: "説明を変更" });
    }

    const infoChanged =
      editDepartment !== (job.department ?? "") ||
      editLocation !== (job.location ?? "") ||
      editEmploymentType !== (job.employment_type ?? "") ||
      editSalaryRange !== (job.salary_range ?? "");
    if (infoChanged) {
      logs.push({ change_type: "info_updated", summary: "求人情報を変更" });
    }

    await getSupabase()
      .from("jobs")
      .update({
        title: editTitle,
        description: editDescription || null,
        department: editDepartment || null,
        location: editLocation || null,
        employment_type: editEmploymentType || null,
        salary_range: editSalaryRange || null,
      })
      .eq("id", job.id);

    if (logs.length > 0) {
      await getSupabase()
        .from("job_change_logs")
        .insert(
          logs.map((log, i) => ({
            id: `log-${job.id}-${Date.now()}-${i}`,
            job_id: job.id,
            change_type: log.change_type,
            summary: log.summary,
            details: log.details ?? null,
          }))
        );
    }

    setSavingInfo(false);
    setEditingInfo(false);
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        求人が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={job.title}
        description={[job.department, job.location, job.employment_type]
          .filter(Boolean)
          .join(" / ")}
        breadcrumb={[{ label: "求人管理", href: "/jobs" }]}
        sticky={false}
        action={
          <Select value={job.status} onValueChange={(v) => v && updateJobStatus(v)}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">公開中</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="closed">終了</SelectItem>
              <SelectItem value="archived">アーカイブ</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count =
              tab.value === "applicants"
                ? applications.length
                : tab.value === "timeline"
                  ? historyEvents.length
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

      {/* ===== 応募者タブ（全幅） ===== */}
      {activeTab === "applicants" && (
        <>
          <SearchBar
            value={applicantSearch}
            onChange={setApplicantSearch}
            placeholder="名前・メールで検索"
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
              {applicantStatusFilter !== "all" && (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                    ステータス：{appStatusLabels[applicantStatusFilter] ?? applicantStatusFilter}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setApplicantStatusFilter("all");
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
              <DropdownMenuItem className="py-2" onClick={() => setApplicantStatusFilter("all")}>
                <span className={cn(applicantStatusFilter === "all" && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(appStatusLabels).map(([key, label]) => (
                <DropdownMenuItem
                  className="py-2"
                  key={key}
                  onClick={() => setApplicantStatusFilter(key)}
                >
                  <span className={cn(applicantStatusFilter === key && "font-medium")}>
                    {label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 overflow-y-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>応募日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = applications.filter((app) => {
                    const profile = app.profiles as unknown as {
                      display_name: string | null;
                      email: string;
                    } | null;
                    if (applicantStatusFilter !== "all" && app.status !== applicantStatusFilter)
                      return false;
                    if (!applicantSearch) return true;
                    const q = applicantSearch.toLowerCase();
                    return (
                      (profile?.display_name ?? "").toLowerCase().includes(q) ||
                      (profile?.email ?? "").toLowerCase().includes(q)
                    );
                  });
                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {applications.length === 0
                            ? "応募者がいません"
                            : "該当する応募者がいません"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return filtered.map((app) => {
                    const profile = app.profiles as unknown as {
                      display_name: string | null;
                      email: string;
                    } | null;
                    return (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Link
                            href={`/applications/${app.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                                {(profile?.display_name ?? profile?.email ?? "-")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{profile?.display_name ?? "-"}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile?.email ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={appStatusColors[app.status] ?? "default"}>
                            {appStatusLabels[app.status] ?? app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(app.applied_at), "yyyy/MM/dd")}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {(activeTab === "detail" || activeTab === "history") && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          {/* ===== 求人詳細タブ ===== */}
          {activeTab === "detail" && (
            <div className="space-y-6 max-w-3xl">
              {/* 求人情報セクション */}
              <section>
                <div className="rounded-lg bg-white border">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">求人情報</h2>
                    <Button variant="outline" size="sm" onClick={startEditingInfo}>
                      編集
                    </Button>
                  </div>
                  <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">タイトル</span>
                      <span className="font-medium">{job.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">部署</span>
                      <span>{job.department ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">勤務地</span>
                      <span>{job.location ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">雇用形態</span>
                      <span>{job.employment_type ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">年収</span>
                      <span>{job.salary_range ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ステータス</span>
                      <Badge
                        variant={
                          job.status === "open"
                            ? "default"
                            : job.status === "closed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {statusLabels[job.status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">作成日</span>
                      <span>{format(new Date(job.created_at), "yyyy/MM/dd")}</span>
                    </div>
                    {job.description && (
                      <div className="pt-3 border-t">
                        <p className="text-muted-foreground mb-1">説明</p>
                        <p className="whitespace-pre-wrap">{job.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 選考ステップセクション */}
              <section>
                <div className="rounded-lg bg-white border">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      選考ステップ
                      <span className="ml-1.5 text-xs font-normal">
                        {steps.filter((s) => s.step_type !== "offer").length + 1}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      {!reorderMode && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={steps.length < 2}
                            onClick={() => {
                              stepsBeforeReorder.current = [...steps];
                              setReorderMode(true);
                            }}
                          >
                            並び替え
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewStepType("interview");
                              setNewStepLabel("");
                              setNewStepFormId("");
                              setDialogOpen(true);
                            }}
                          >
                            追加
                          </Button>
                        </>
                      )}
                      {reorderMode && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={confirmingReorder}
                            onClick={() => {
                              setSteps(stepsBeforeReorder.current);
                              setReorderMode(false);
                            }}
                          >
                            キャンセル
                          </Button>
                          <Button size="sm" onClick={confirmReorder} disabled={confirmingReorder}>
                            {confirmingReorder ? "保存中..." : "確定"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    {steps
                      .filter((s) => s.step_type !== "offer")
                      .map((step, index) => (
                        <div
                          key={step.id}
                          draggable={reorderMode}
                          onDragStart={reorderMode ? () => setDragIndex(index) : undefined}
                          onDragOver={
                            reorderMode
                              ? (e) => {
                                  e.preventDefault();
                                  setDragOverIndex(index);
                                }
                              : undefined
                          }
                          onDrop={
                            reorderMode
                              ? () => {
                                  if (dragIndex !== null) reorderSteps(dragIndex, index);
                                  setDragIndex(null);
                                  setDragOverIndex(null);
                                }
                              : undefined
                          }
                          onDragEnd={
                            reorderMode
                              ? () => {
                                  setDragIndex(null);
                                  setDragOverIndex(null);
                                }
                              : undefined
                          }
                          onClick={!reorderMode ? () => startEditStep(step) : undefined}
                          className={cn(
                            "flex items-center gap-3 px-5 py-4 border-b",
                            reorderMode ? "cursor-grab" : "cursor-pointer hover:bg-accent/40",
                            reorderMode &&
                              dragOverIndex === index &&
                              dragIndex !== index &&
                              "bg-accent/60"
                          )}
                        >
                          <GripVertical
                            className={cn(
                              "h-4 w-4 shrink-0",
                              reorderMode ? "text-muted-foreground" : "text-muted-foreground/30"
                            )}
                          />
                          <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{step.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {stepTypeLabels[step.step_type] ?? step.step_type}
                              {step.related_id &&
                                ["screening", "form"].includes(step.step_type) &&
                                forms.find((f) => f.id === step.related_id) && (
                                  <>
                                    {" — "}
                                    <Link
                                      href={`/forms/${step.related_id}`}
                                      className="text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {forms.find((f) => f.id === step.related_id)!.title}
                                    </Link>
                                  </>
                                )}
                              {step.related_id &&
                                step.step_type === "interview" &&
                                (() => {
                                  const ids = step.related_id!.split(",").filter(Boolean);
                                  const linked = ids
                                    .map((sid) => interviews.find((iv) => iv.id === sid))
                                    .filter(Boolean);
                                  if (linked.length === 0) return null;
                                  return (
                                    <>
                                      {" — "}
                                      {linked.map((iv, i) => (
                                        <span key={iv!.id}>
                                          {i > 0 && "、"}
                                          <Link
                                            href={`/scheduling/${iv!.id}`}
                                            className="text-primary hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {iv!.title}
                                          </Link>
                                        </span>
                                      ))}
                                    </>
                                  );
                                })()}
                            </p>
                          </div>
                        </div>
                      ))}
                    {/* 内定ステップ（固定・末尾） */}
                    <div className="flex items-center gap-3 px-5 py-4 bg-muted/30">
                      <div className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">内定</p>
                        <p className="text-xs text-muted-foreground">
                          すべてのステップ完了後に自動適用
                        </p>
                      </div>
                    </div>
                  </div>
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
          {/* フィルターバー */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
              {(statusFilter || eventFilter) && (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {statusFilter && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      ステータス：{statusFilter}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter(null);
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )}
                  {eventFilter && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      イベント：{eventFilter}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventFilter(null);
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto py-2">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="py-2">ステータス</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="py-2">
                  <DropdownMenuItem className="py-2" onClick={() => setStatusFilter(null)}>
                    <span className={cn(!statusFilter && "font-medium")}>すべて</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {[...new Set(historyEvents.map((ev) => ev.label))].map((label) => (
                    <DropdownMenuItem
                      className="py-2"
                      key={label}
                      onClick={() => setStatusFilter(label)}
                    >
                      <span className={cn(statusFilter === label && "font-medium")}>{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="py-2">イベント</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="py-2">
                  <DropdownMenuItem className="py-2" onClick={() => setEventFilter(null)}>
                    <span className={cn(!eventFilter && "font-medium")}>すべて</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {[...new Set(historyEvents.map((ev) => ev.eventType))].map((type) => (
                    <DropdownMenuItem
                      className="py-2"
                      key={type}
                      onClick={() => setEventFilter(type)}
                    >
                      <span className={cn(eventFilter === type && "font-medium")}>{type}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* 検索バー */}
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
                  <TableHead>イベント</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = historyEvents.filter((ev) => {
                    if (statusFilter && ev.label !== statusFilter) return false;
                    if (eventFilter && ev.eventType !== eventFilter) return false;
                    if (!historySearch) return true;
                    const q = historySearch.toLowerCase();
                    return (
                      ev.applicantName.toLowerCase().includes(q) ||
                      ev.applicantEmail.toLowerCase().includes(q)
                    );
                  });
                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {historyEvents.length === 0
                            ? "履歴がありません"
                            : "該当する履歴がありません"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return filtered.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">{ev.applicantName}</TableCell>
                      <TableCell className="text-muted-foreground">{ev.applicantEmail}</TableCell>
                      <TableCell>{ev.eventType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ev.status === "completed" || ev.status === "offered"
                              ? "secondary"
                              : ev.status === "rejected"
                                ? "destructive"
                                : ev.status === "withdrawn" || ev.status === "skipped"
                                  ? "outline"
                                  : "default"
                          }
                        >
                          {ev.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
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
        open={editingInfo}
        onOpenChange={setEditingInfo}
        title="求人情報を編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={saveInfo}
        saving={savingInfo}
        saveDisabled={!editTitle}
      >
        {editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="バックエンドエンジニア"
              />
            </div>
            <div className="space-y-2">
              <Label>部署</Label>
              <Input
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="エンジニアリング"
              />
            </div>
            <div className="space-y-2">
              <Label>勤務地</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="東京"
              />
            </div>
            <div className="space-y-2">
              <Label>雇用形態</Label>
              <Input
                value={editEmploymentType}
                onChange={(e) => setEditEmploymentType(e.target.value)}
                placeholder="正社員"
              />
            </div>
            <div className="space-y-2">
              <Label>年収</Label>
              <Input
                value={editSalaryRange}
                onChange={(e) => setEditSalaryRange(e.target.value)}
                placeholder="500万〜800万"
              />
            </div>
          </div>
        )}
        {editTab === "description" && (
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="求人の説明"
              rows={8}
            />
          </div>
        )}
      </EditPanel>

      <EditPanel
        open={editStepOpen}
        onOpenChange={setEditStepOpen}
        title="ステップを編集"
        onSave={saveEditStep}
        saving={savingEditStep}
        saveDisabled={!editStepLabel}
        onDelete={deleteEditStep}
        deleting={deletingEditStep}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>種類</Label>
            <Select
              value={editStepType}
              onValueChange={(v) => {
                if (!v) return;
                setEditStepType(v);
                setEditStepFormId("");
                setEditStepScheduleIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(selectableStepTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {["screening", "form"].includes(editStepType) && (
            <div className="space-y-2">
              <Label>フォーム</Label>
              <Select value={editStepFormId} onValueChange={(v) => v && setEditStepFormId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="フォームを選択（任意）">
                    {(v: string) => forms.find((f) => f.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {forms.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      フォームがありません
                    </div>
                  ) : (
                    forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {editStepFormId && (
                <Link
                  href={`/forms/${editStepFormId}`}
                  className="text-sm text-primary hover:underline"
                >
                  フォームの詳細を表示 →
                </Link>
              )}
            </div>
          )}
          {editStepType === "interview" && (
            <div className="space-y-2">
              <Label>日程調整</Label>
              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">日程調整がありません</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                  {interviews.map((iv) => (
                    <label key={iv.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editStepScheduleIds.includes(iv.id)}
                        onCheckedChange={(checked) => {
                          setEditStepScheduleIds((prev) =>
                            checked ? [...prev, iv.id] : prev.filter((sid) => sid !== iv.id)
                          );
                        }}
                      />
                      <span className="text-sm">{iv.title}</span>
                    </label>
                  ))}
                </div>
              )}
              {editStepScheduleIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {editStepScheduleIds.map((sid) => {
                    const iv = interviews.find((i) => i.id === sid);
                    return iv ? (
                      <Link
                        key={sid}
                        href={`/scheduling/${sid}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {iv.title}
                      </Link>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>ラベル *</Label>
            <Input
              value={editStepLabel}
              onChange={(e) => setEditStepLabel(e.target.value)}
              placeholder="一次面接"
            />
          </div>
        </div>
      </EditPanel>

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="選考ステップを追加"
        onSave={addStep}
        saving={savingStep}
        saveDisabled={!newStepLabel}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>種類</Label>
            <Select
              value={newStepType}
              onValueChange={(v) => {
                if (!v) return;
                setNewStepType(v);
                setNewStepFormId("");
                setNewStepScheduleIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(selectableStepTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {["screening", "form"].includes(newStepType) && (
            <div className="space-y-2">
              <Label>フォーム</Label>
              <Select value={newStepFormId} onValueChange={(v) => v && setNewStepFormId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="フォームを選択（任意）">
                    {(v: string) => forms.find((f) => f.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {forms.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      フォームがありません
                    </div>
                  ) : (
                    forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {newStepType === "interview" && (
            <div className="space-y-2">
              <Label>日程調整</Label>
              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">日程調整がありません</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                  {interviews.map((iv) => (
                    <label key={iv.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={newStepScheduleIds.includes(iv.id)}
                        onCheckedChange={(checked) => {
                          setNewStepScheduleIds((prev) =>
                            checked ? [...prev, iv.id] : prev.filter((sid) => sid !== iv.id)
                          );
                        }}
                      />
                      <span className="text-sm">{iv.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>ラベル *</Label>
            <Input
              value={newStepLabel}
              onChange={(e) => setNewStepLabel(e.target.value)}
              placeholder="一次面接"
            />
          </div>
        </div>
      </EditPanel>
    </>
  );
}
