"use client";

import { useState } from "react";
import { useTabParam } from "@hr1/shared-ui";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import * as jobRepository from "@/lib/repositories/job-repository";
import * as templateRepo from "@/lib/repositories/selection-step-template-repository";
import * as flowRepo from "@/lib/repositories/selection-flow-repository";
import { validators, validateForm, type ValidationErrors } from "@hr1/shared-ui";
import { StepType } from "@/lib/constants";

import type { Job, SelectionFlow, SelectionStepTemplate } from "@/types/database";

export const JOB_TAB_STATUSES: Record<string, string[]> = {
  active: ["open", "draft"],
  closed: ["closed"],
  archived: ["archived"],
};

interface AppCounts {
  total: number;
  offered: number;
}

export function useJobsList() {
  return useOrgQuery<Job[]>("jobs", (orgId) =>
    applicantRepo.fetchJobsWithCounts(getSupabase(), orgId)
  );
}

export function useJobAppCounts() {
  return useOrgQuery<Record<string, AppCounts>>("job-app-counts", (orgId) =>
    applicantRepo.fetchApplicationCounts(getSupabase(), orgId)
  );
}

export async function deleteJob(
  organizationId: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await jobRepository.deleteJob(getSupabase(), jobId, organizationId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "求人の削除に失敗しました" };
  }
}

export function useJobsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useTabParam("active");

  const { data: jobs = [], isLoading, error: jobsError, mutate: mutateJobs } = useJobsList();
  const { data: appCounts = {} } = useJobAppCounts();

  const filtered = jobs.filter((job) => {
    const allowed = JOB_TAB_STATUSES[activeTab] ?? [activeTab];
    if (!allowed.includes(job.status)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.department ?? "").toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q)
    );
  });

  return {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    jobs,
    isLoading,
    jobsError,
    mutateJobs,
    appCounts,
    filtered,
  };
}

export interface StepDraft {
  tempId: string;
  step_type: string;
  label: string;
  screeningType: string | null;
  formId: string | null;
  requiresReview: boolean;
  /** null の場合はユーザー手動入力。非 null の場合は既存テンプレート由来（再作成スキップ） */
  templateId: string | null;
}

export function useSelectionStepTemplates() {
  return useOrgQuery<SelectionStepTemplate[]>("selection-step-templates", (orgId) =>
    templateRepo.findByOrg(getSupabase(), orgId)
  );
}

export function useSelectionFlows() {
  return useOrgQuery<SelectionFlow[]>("selection-flows", (orgId) =>
    flowRepo.findByOrg(getSupabase(), orgId)
  );
}

export interface FlowWithTemplates extends SelectionFlow {
  templates: SelectionStepTemplate[];
}

export function useNewJob() {
  const { organization } = useOrg();

  const createJob = async (params: {
    title: string;
    description: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    salaryRange: string | null;
    status: string;
    flowId: string | null;
    steps: StepDraft[];
  }) => {
    if (!organization) throw new Error("Organization not found");
    const client = getSupabase();
    const jobId = crypto.randomUUID();

    const { error: jobError } = await applicantRepo.createJob(client, {
      id: jobId,
      organization_id: organization.id,
      title: params.title,
      description: params.description,
      department: params.department,
      location: params.location,
      employment_type: params.employmentType,
      salary_range: params.salaryRange,
      status: params.status,
      flow_id: params.flowId,
    });
    if (jobError) throw jobError;

    if (params.steps.length > 0) {
      const { error: stepsError } = await applicantRepo.createJobSteps(
        client,
        params.steps.map((step, index) => ({
          id: crypto.randomUUID(),
          job_id: jobId,
          step_type: step.step_type,
          step_order: index + 1,
          label: step.label,
          template_id: step.templateId,
          screening_type: step.screeningType,
          form_id: step.formId,
          requires_review: step.requiresReview,
        }))
      );
      if (stepsError) throw stepsError;
    }
  };

  return { createJob };
}

const DEFAULT_STEPS: StepDraft[] = [
  {
    tempId: "1",
    step_type: StepType.Screening,
    label: "書類選考",
    screeningType: "resume",
    formId: null,
    requiresReview: true,
    templateId: null,
  },
  {
    tempId: "2",
    step_type: StepType.Interview,
    label: "一次面接",
    screeningType: null,
    formId: null,
    requiresReview: false,
    templateId: null,
  },
  {
    tempId: "3",
    step_type: StepType.Offer,
    label: "内定",
    screeningType: null,
    formId: null,
    requiresReview: false,
    templateId: null,
  },
];

export function useNewJobPage() {
  const { organization } = useOrg();
  const { createJob } = useNewJob();
  const { data: templates = [], mutate: mutateTemplates } = useSelectionStepTemplates();
  const { data: flows = [] } = useSelectionFlows();
  const [dialogTab, setDialogTab] = useState("basic");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [status, setStatus] = useState("open");
  const [flowMode, setFlowMode] = useState<"select" | "create">("select");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [newFlowName, setNewFlowName] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}`,
        step_type: StepType.Interview,
        label: "",
        screeningType: null,
        formId: null,
        requiresReview: false,
        templateId: null,
      },
    ]);
  };

  const addStepFromTemplate = (template: SelectionStepTemplate) => {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}-${template.id}`,
        step_type: template.step_type,
        label: template.name,
        screeningType: template.screening_type,
        formId: template.form_id,
        requiresReview: template.requires_review,
        templateId: template.id,
      },
    ]);
  };

  const addStepsFromFlow = (flowId: string) => {
    const flowTemplates = templates
      .filter((t) => t.flow_id === flowId)
      .sort((a, b) => a.sort_order - b.sort_order);
    setSelectedFlowId(flowId);
    setSteps(
      flowTemplates.map((t) => ({
        tempId: `${Date.now()}-${t.id}`,
        step_type: t.step_type,
        label: t.name,
        screeningType: t.screening_type,
        formId: t.form_id,
        requiresReview: t.requires_review,
        templateId: t.id,
      }))
    );
  };

  const flowsWithTemplates: FlowWithTemplates[] = flows.map((f) => ({
    ...f,
    templates: templates
      .filter((t) => t.flow_id === f.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const removeStep = (tempId: string) => {
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateStep = (
    tempId: string,
    field: "step_type" | "label" | "screeningType" | "requiresReview",
    value: string | boolean | null
  ) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const updated = { ...s, [field]: value, templateId: null };
        if (field === "step_type") {
          if (value !== StepType.Screening) updated.screeningType = null;
          if (value === StepType.Offer) updated.requiresReview = false;
        }
        return updated;
      })
    );
  };

  const reorderSteps = (oldIndex: number, newIndex: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const setTitleWithClear = (value: string) => {
    setTitle(value);
    setFormErrors((prev) => ({ ...prev, title: "" }));
  };

  const handleSubmit = async (): Promise<{ success: boolean; error?: string }> => {
    const errors = validateForm(
      {
        title: [validators.required("タイトル"), validators.maxLength(200, "タイトル")],
      },
      { title }
    );
    if (errors) {
      setFormErrors(errors);
      return { success: false, error: "validation" };
    }
    setFormErrors({});
    setSaving(true);

    try {
      const client = getSupabase();
      let flowId = selectedFlowId;

      // 新規フロー作成モード: フロー + テンプレートを先に作成
      if (flowMode === "create" && newFlowName.trim() && organization) {
        const flow = await flowRepo.createFlow(client, {
          organization_id: organization.id,
          name: newFlowName.trim(),
          description: null,
        });
        flowId = flow.id;

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const isScreening = step.step_type === StepType.Screening;
          const created = await templateRepo.createTemplate(client, {
            organization_id: organization.id,
            flow_id: flow.id,
            name: step.label.trim() || `ステップ ${i + 1}`,
            step_type: step.step_type,
            screening_type: isScreening && !step.formId ? step.screeningType : null,
            form_id: isScreening ? step.formId : null,
            requires_review: step.requiresReview,
            description: null,
            sort_order: i,
          });
          steps[i] = { ...step, templateId: created.id };
        }
      }

      await createJob({
        title,
        description,
        department: department || null,
        location: location || null,
        employmentType: employmentType || null,
        salaryRange: salaryRange || null,
        status,
        flowId,
        steps,
      });
      mutateTemplates();
      return { success: true };
    } catch {
      return { success: false, error: "求人の作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDialogTab("basic");
    setTitle("");
    setDescription("");
    setDepartment("");
    setLocation("");
    setEmploymentType("");
    setSalaryRange("");
    setStatus("draft");
    setFlowMode("select");
    setSelectedFlowId(null);
    setNewFlowName("");
    setSteps(DEFAULT_STEPS);
    setFormErrors({});
  };

  return {
    dialogTab,
    setDialogTab,
    title,
    setTitle: setTitleWithClear,
    description,
    setDescription,
    department,
    setDepartment,
    location,
    setLocation,
    employmentType,
    setEmploymentType,
    salaryRange,
    setSalaryRange,
    status,
    setStatus,
    flowMode,
    setFlowMode,
    selectedFlowId,
    newFlowName,
    setNewFlowName,
    steps,
    addStep,
    addStepFromTemplate,
    addStepsFromFlow,
    removeStep,
    updateStep,
    reorderSteps,
    templates,
    flowsWithTemplates,
    saving,
    formErrors,
    handleSubmit,
    reset,
  };
}
