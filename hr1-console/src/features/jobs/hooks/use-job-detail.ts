"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { reorderSteps as reorderStepsUtil } from "@/lib/reorder-steps";
import { getSupabase } from "@/lib/supabase/browser";
import type { Job, JobStep, Application, Interview } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import { StepType, FORM_STEP_TYPES } from "@/lib/constants";
import * as jobRepository from "@/lib/repositories/job-repository";
import * as auditRepository from "@/lib/repositories/audit-repository";
import { getCurrentUserId } from "@/lib/get-current-user-id";
import { resolveRelatedId } from "@/features/jobs/rules";

export function useJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [job, setJob] = useState<Job | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("detail");

  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<string>("all");

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
      setAuditRefreshKey((k) => k + 1);
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
      const userId = await getCurrentUserId();
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
    setAuditRefreshKey((k) => k + 1);
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
      const userId = await getCurrentUserId();
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

  const [stepManageOpen, setStepManageOpen] = useState(false);
  const [savingStepManage, setSavingStepManage] = useState(false);

  const saveStepsManage = async (
    updatedSteps: JobStep[],
    newSteps: { step_type: string; label: string; related_id: string | null }[],
    deletedIds: string[]
  ) => {
    setSavingStepManage(true);
    try {
      const client = getSupabase();

      for (const delId of deletedIds) {
        await jobRepository.deleteJobStep(client, delId);
      }

      for (let i = 0; i < updatedSteps.length; i++) {
        const s = updatedSteps[i];
        await jobRepository.updateJobStep(client, s.id, {
          step_type: s.step_type,
          label: s.label,
          related_id: s.related_id,
          step_order: s.step_order,
        });
      }

      const baseOrder = updatedSteps.length;
      for (let i = 0; i < newSteps.length; i++) {
        const s = newSteps[i];
        await jobRepository.insertJobStep(client, {
          id: crypto.randomUUID(),
          job_id: id,
          step_type: s.step_type,
          step_order: baseOrder + i + 1,
          label: s.label,
          related_id: s.related_id,
        });
      }

      await load();
      setAuditRefreshKey((k) => k + 1);
      setStepManageOpen(false);
    } catch (err) {
      console.error("ステップ保存エラー:", err);
    } finally {
      setSavingStepManage(false);
    }
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
    auditRefreshKey,
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

    // Step manage dialog
    stepManageOpen,
    setStepManageOpen,
    savingStepManage,
    saveStepsManage,

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
