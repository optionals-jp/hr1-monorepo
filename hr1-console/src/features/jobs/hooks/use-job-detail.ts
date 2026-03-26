"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { reorderSteps as reorderStepsUtil } from "@/lib/reorder-steps";
import { getSupabase } from "@/lib/supabase/browser";
import type { Job, JobStep, AuditLog, Application, Interview } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import { applicationStatusLabels as appStatusLabels, stepStatusLabels } from "@/lib/constants";
import { fetchJobDetail } from "@/lib/repositories/job-repository";
import type { HistoryEvent } from "@/features/jobs/types";

export function useJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [changeLogs, setChangeLogs] = useState<AuditLog[]>([]);
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
    const result = await fetchJobDetail(getSupabase(), id, organization.id);

    setJob(result.job);
    setSteps(result.steps);
    setApplications(result.applications);
    setChangeLogs(result.auditLogs);

    // Build timeline events
    const events: HistoryEvent[] = [];
    for (const app of result.applications ?? []) {
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
    if (!organization) return;
    const oldStatus = job?.status;
    await getSupabase().from("jobs").update({ status }).eq("id", id);
    setJob((prev) => (prev ? { ...prev, status: status as Job["status"] } : prev));

    if (oldStatus && oldStatus !== status) {
      const { data: logsData } = await getSupabase()
        .from("audit_logs")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("table_name", "jobs")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
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

    if (organization) {
      const userId = (await getSupabase().auth.getUser()).data.user?.id;
      if (!userId) throw new Error("認証ユーザーが取得できません");
      await getSupabase()
        .from("audit_logs")
        .insert({
          organization_id: organization.id,
          user_id: userId,
          action: "create",
          table_name: "jobs",
          record_id: id,
          metadata: { summary: `ステップ「${newStepLabel}」を追加`, detail_action: "step_added" },
          source: "console",
        });
    }

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

    if (step && organization) {
      const userId = (await getSupabase().auth.getUser()).data.user?.id;
      if (!userId) throw new Error("認証ユーザーが取得できません");
      await getSupabase()
        .from("audit_logs")
        .insert({
          organization_id: organization.id,
          user_id: userId,
          action: "delete",
          table_name: "jobs",
          record_id: id,
          metadata: { summary: `ステップ「${step.label}」を削除`, detail_action: "step_deleted" },
          source: "console",
        });
    }

    load();
  };

  const reorderSteps = (fromIndex: number, toIndex: number) => {
    const result = reorderStepsUtil(steps, fromIndex, toIndex);
    if (result) setSteps(result);
  };

  const confirmReorder = async () => {
    setConfirmingReorder(true);
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

    setSavingInfo(false);
    setEditingInfo(false);
    await load();
  }

  return {
    // Core data
    job,
    steps,
    applications,
    historyEvents,
    changeLogs,
    loading,
    forms,
    interviews,

    // Tab
    activeTab,
    setActiveTab,

    // Applicants tab
    applicantSearch,
    setApplicantSearch,
    applicantStatusFilter,
    setApplicantStatusFilter,

    // Timeline tab
    historySearch,
    setHistorySearch,
    statusFilter,
    setStatusFilter,
    eventFilter,
    setEventFilter,

    // Mutations
    updateJobStatus,

    // Step add
    dialogOpen,
    setDialogOpen,
    newStepType,
    setNewStepType,
    newStepLabel,
    setNewStepLabel,
    newStepFormId,
    setNewStepFormId,
    newStepScheduleIds,
    setNewStepScheduleIds,
    savingStep,
    addStep,

    // Step edit
    editStepOpen,
    setEditStepOpen,
    editStepId,
    editStepType,
    setEditStepType,
    editStepLabel,
    setEditStepLabel,
    editStepFormId,
    setEditStepFormId,
    editStepScheduleIds,
    setEditStepScheduleIds,
    savingEditStep,
    saveEditStep,
    deletingEditStep,
    deleteEditStep,
    startEditStep,

    // Reorder
    reorderMode,
    setReorderMode,
    dragIndex,
    setDragIndex,
    dragOverIndex,
    setDragOverIndex,
    confirmingReorder,
    confirmReorder,
    reorderSteps,
    stepsBeforeReorder,
    setSteps,

    // Info edit
    editingInfo,
    setEditingInfo,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editDepartment,
    setEditDepartment,
    editLocation,
    setEditLocation,
    editEmploymentType,
    setEditEmploymentType,
    editSalaryRange,
    setEditSalaryRange,
    savingInfo,
    saveInfo,
    startEditingInfo,
  };
}
