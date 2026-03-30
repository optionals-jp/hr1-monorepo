"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { reorderSteps as reorderStepsUtil } from "@/lib/reorder-steps";
import { getSupabase } from "@/lib/supabase/browser";
import type { Job, JobStep, AuditLog, Application, Interview } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import { StepType, FORM_STEP_TYPES } from "@/lib/constants";
import * as jobRepository from "@/lib/repositories/job-repository";
import * as auditRepository from "@/lib/repositories/audit-repository";
import { buildHistoryEvents, resolveRelatedId } from "@/features/jobs/rules";
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
  const [newStepType, setNewStepType] = useState<string>(StepType.Interview);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepFormId, setNewStepFormId] = useState<string>("");
  const [newStepInterviewId, setNewStepInterviewId] = useState<string>("");
  const [savingStep, setSavingStep] = useState(false);
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  // Step edit
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [editStepId, setEditStepId] = useState<string>("");
  const [editStepType, setEditStepType] = useState<string>(StepType.Interview);
  const [editStepLabel, setEditStepLabel] = useState("");
  const [editStepFormId, setEditStepFormId] = useState<string>("");
  const [editStepInterviewId, setEditStepInterviewId] = useState<string>("");
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
    const client = getSupabase();
    const result = await jobRepository.fetchJobDetail(client, id, organization.id);

    setJob(result.job);
    setSteps(result.steps);
    setApplications(result.applications);
    setChangeLogs(result.auditLogs);
    setHistoryEvents(buildHistoryEvents(result.applications));
    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    const client = getSupabase();
    jobRepository.fetchForms(client, organization.id).then(setForms);
    jobRepository.fetchInterviews(client, organization.id).then(setInterviews);
  }, [organization]);

  const updateJobStatus = async (status: string) => {
    if (!organization) return;
    const client = getSupabase();
    const oldStatus = job?.status;
    await jobRepository.updateJobStatus(client, id, organization.id, status);
    setJob((prev) => (prev ? { ...prev, status: status as Job["status"] } : prev));

    if (oldStatus && oldStatus !== status) {
      const { data: logsData } = await auditRepository.fetchAuditLogs(client, {
        organizationId: organization.id,
        tableName: "jobs",
        recordId: id,
      });
      setChangeLogs(logsData ?? []);
    }
  };

  const addStep = async () => {
    if (!newStepLabel) return;
    setSavingStep(true);

    const client = getSupabase();
    const nextOrder = steps.length + 1;
    const stepId = crypto.randomUUID();
    const relatedId = resolveRelatedId(
      newStepType,
      FORM_STEP_TYPES,
      newStepFormId,
      StepType.Interview,
      newStepInterviewId
    );

    const { error } = await jobRepository.insertJobStep(client, {
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
      const userId = (await client.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("認証ユーザーが取得できません");
      await auditRepository.insertAuditLog(client, {
        organization_id: organization.id,
        table_name: "jobs",
        record_id: id,
        action: "create",
        metadata: {
          summary: `ステップ「${newStepLabel}」を追加`,
          detail_action: "step_added",
          user_id: userId,
        },
        performed_by: userId,
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
    setNewStepType(StepType.Interview);
    setNewStepLabel("");
    setNewStepFormId("");
    setNewStepInterviewId("");
  };

  const removeStep = async (stepId: string) => {
    const client = getSupabase();
    const step = steps.find((s) => s.id === stepId);
    await jobRepository.deleteJobStep(client, stepId);

    if (step && organization) {
      const userId = (await client.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("認証ユーザーが取得できません");
      await auditRepository.insertAuditLog(client, {
        organization_id: organization.id,
        table_name: "jobs",
        record_id: id,
        action: "delete",
        metadata: {
          summary: `ステップ「${step.label}」を削除`,
          detail_action: "step_deleted",
          user_id: userId,
        },
        performed_by: userId,
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
    try {
      await jobRepository.reorderJobStepsRpc(
        getSupabase(),
        id,
        steps.map((s) => s.id),
        steps.map((s) => s.step_order)
      );
    } catch (err) {
      console.error("並び替えエラー:", err);
      await load();
    }
    setConfirmingReorder(false);
    setReorderMode(false);
  };

  const startEditStep = (step: JobStep) => {
    setEditStepId(step.id);
    setEditStepType(step.step_type);
    setEditStepLabel(step.label);
    if (step.step_type === StepType.Interview) {
      setEditStepFormId("");
      setEditStepInterviewId(step.related_id ?? "");
    } else {
      setEditStepFormId(step.related_id ?? "");
      setEditStepInterviewId("");
    }
    setEditStepOpen(true);
  };

  const saveEditStep = async () => {
    if (!editStepLabel) return;
    setSavingEditStep(true);
    const relatedId = resolveRelatedId(
      editStepType,
      FORM_STEP_TYPES,
      editStepFormId,
      StepType.Interview,
      editStepInterviewId
    );
    await jobRepository.updateJobStep(getSupabase(), editStepId, {
      step_type: editStepType,
      label: editStepLabel,
      related_id: relatedId,
    });
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
    if (!job || !organization) return;
    setSavingInfo(true);

    await jobRepository.updateJob(getSupabase(), job.id, organization.id, {
      title: editTitle,
      description: editDescription || null,
      department: editDepartment || null,
      location: editLocation || null,
      employment_type: editEmploymentType || null,
      salary_range: editSalaryRange || null,
    });

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
    newStepInterviewId,
    setNewStepInterviewId,
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
    editStepInterviewId,
    setEditStepInterviewId,
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
