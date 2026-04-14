"use client";

import { useCallback, useMemo, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as flowRepo from "@/lib/repositories/selection-flow-repository";
import * as templateRepo from "@/lib/repositories/selection-step-template-repository";
import * as applicationRepo from "@/lib/repositories/application-repository";
import { validators, validateForm, type ValidationErrors } from "@hr1/shared-ui";
import { StepStatus } from "@/lib/constants";
import type { Application, Job, SelectionFlow, SelectionStepTemplate } from "@/types/database";

// ---------- types ----------

export interface TemplateWithCounts extends SelectionStepTemplate {
  inProgressCount: number;
  completedCount: number;
  pendingCount: number;
  totalCount: number;
}

export interface RelatedJob extends Job {
  applicationCount: number;
}

interface StepFormState {
  id: string | null;
  flow_id: string | null;
  name: string;
  step_type: string;
  description: string;
  sort_order: string;
}

const EMPTY_STEP_FORM: StepFormState = {
  id: null,
  flow_id: null,
  name: "",
  step_type: "screening",
  description: "",
  sort_order: "0",
};

// ---------- main hook ----------

export function useSelectionFlowDetail(flowId: string) {
  const { organization } = useOrg();

  // --- data fetching ---
  const {
    data: flow,
    isLoading: flowLoading,
    error: flowError,
    mutate: mutateFlow,
  } = useQuery<SelectionFlow | null>(`selection-flow-${flowId}`, () =>
    flowRepo.findById(getSupabase(), flowId)
  );

  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useOrgQuery<SelectionStepTemplate[]>("selection-step-templates", (orgId) =>
    templateRepo.findByOrg(getSupabase(), orgId)
  );

  const { data: applications = [], isLoading: applicationsLoading } = useOrgQuery<Application[]>(
    "applications",
    (orgId) => applicationRepo.fetchApplications(getSupabase(), orgId)
  );

  const { data: jobs = [] } = useOrgQuery<Job[]>("jobs-for-flow", (orgId) =>
    applicationRepo.fetchJobsForFilter(getSupabase(), orgId)
  );

  // --- tab state ---
  const [activeTab, setActiveTab] = useState("overview");

  // --- step form ---
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepForm, setStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);
  const [stepFormErrors, setStepFormErrors] = useState<ValidationErrors>({});
  const [stepSaving, setStepSaving] = useState(false);
  const [stepDeletingId, setStepDeletingId] = useState<string | null>(null);

  // ---------- computed: steps with counts ----------

  const stepNames = useMemo(() => {
    return new Set(templates.filter((t) => t.flow_id === flowId).map((t) => t.name));
  }, [templates, flowId]);

  const steps = useMemo<TemplateWithCounts[]>(() => {
    const flowTemplates = templates.filter((t) => t.flow_id === flowId);

    const inProgress = new Map<string, number>();
    const completed = new Map<string, number>();
    const pending = new Map<string, number>();

    for (const app of applications) {
      if (app.status === "rejected" || app.status === "withdrawn") continue;
      for (const step of app.application_steps ?? []) {
        if (!stepNames.has(step.label)) continue;
        if (step.status === StepStatus.InProgress) {
          inProgress.set(step.label, (inProgress.get(step.label) ?? 0) + 1);
        } else if (step.status === StepStatus.Completed) {
          completed.set(step.label, (completed.get(step.label) ?? 0) + 1);
        } else if (step.status === StepStatus.Pending) {
          pending.set(step.label, (pending.get(step.label) ?? 0) + 1);
        }
      }
    }

    return flowTemplates
      .map((t) => {
        const ip = inProgress.get(t.name) ?? 0;
        const cp = completed.get(t.name) ?? 0;
        const pd = pending.get(t.name) ?? 0;
        return {
          ...t,
          inProgressCount: ip,
          completedCount: cp,
          pendingCount: pd,
          totalCount: ip + cp + pd,
        };
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [templates, applications, flowId, stepNames]);

  // ---------- computed: related jobs ----------

  const relatedJobs = useMemo<RelatedJob[]>(() => {
    // application の job_id ごとに、application_steps の label がこのフローのステップ名に合致するかチェック
    const jobAppCounts = new Map<string, number>();
    const jobIds = new Set<string>();

    for (const app of applications) {
      if (app.status === "rejected" || app.status === "withdrawn") continue;
      const appStepLabels = (app.application_steps ?? []).map((s) => s.label);
      const hasMatch = appStepLabels.some((label) => stepNames.has(label));
      if (hasMatch) {
        jobIds.add(app.job_id);
        jobAppCounts.set(app.job_id, (jobAppCounts.get(app.job_id) ?? 0) + 1);
      }
    }

    return jobs
      .filter((j) => jobIds.has(j.id))
      .map((j) => ({ ...j, applicationCount: jobAppCounts.get(j.id) ?? 0 }));
  }, [applications, jobs, stepNames]);

  // ---------- overview summary ----------

  const summary = useMemo(() => {
    const totalApplicants = new Set<string>();
    for (const app of applications) {
      if (app.status === "rejected" || app.status === "withdrawn") continue;
      const hasMatch = (app.application_steps ?? []).some((s) => stepNames.has(s.label));
      if (hasMatch) totalApplicants.add(app.applicant_id);
    }
    return {
      stepCount: steps.length,
      jobCount: relatedJobs.length,
      applicantCount: totalApplicants.size,
    };
  }, [applications, stepNames, steps, relatedJobs]);

  // ---------- step CRUD ----------

  const openAddStepDialog = useCallback(() => {
    const nextOrder = steps.reduce((max, t) => Math.max(max, t.sort_order), -1) + 1;
    setStepForm({ ...EMPTY_STEP_FORM, flow_id: flowId, sort_order: String(nextOrder) });
    setStepFormErrors({});
    setStepDialogOpen(true);
  }, [steps, flowId]);

  const openEditStepDialog = useCallback((template: SelectionStepTemplate) => {
    setStepForm({
      id: template.id,
      flow_id: template.flow_id,
      name: template.name,
      step_type: template.step_type,
      description: template.description ?? "",
      sort_order: String(template.sort_order),
    });
    setStepFormErrors({});
    setStepDialogOpen(true);
  }, []);

  const handleStepSave = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };

    const errors = validateForm(
      {
        name: [validators.required("ステップ名"), validators.maxLength(100, "ステップ名")],
        step_type: [validators.required("種別")],
      },
      { name: stepForm.name, step_type: stepForm.step_type }
    );
    if (errors) {
      setStepFormErrors(errors);
      return { success: false };
    }
    setStepFormErrors({});

    const sortOrderNum = Number(stepForm.sort_order);
    const sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : 0;

    setStepSaving(true);
    try {
      if (stepForm.id) {
        await templateRepo.updateTemplate(getSupabase(), stepForm.id, organization.id, {
          name: stepForm.name.trim(),
          step_type: stepForm.step_type,
          description: stepForm.description.trim() || null,
          sort_order: sortOrder,
          flow_id: stepForm.flow_id,
        });
      } else {
        await templateRepo.createTemplate(getSupabase(), {
          organization_id: organization.id,
          flow_id: stepForm.flow_id,
          name: stepForm.name.trim(),
          step_type: stepForm.step_type,
          description: stepForm.description.trim() || null,
          sort_order: sortOrder,
        });
      }
      setStepDialogOpen(false);
      mutateTemplates();
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存に失敗しました";
      return { success: false, error: message };
    } finally {
      setStepSaving(false);
    }
  }, [organization, stepForm, mutateTemplates]);

  const handleStepDelete = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false, error: "組織が見つかりません" };
      setStepDeletingId(id);
      try {
        await templateRepo.deleteTemplate(getSupabase(), id, organization.id);
        mutateTemplates();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "削除に失敗しました";
        return { success: false, error: message };
      } finally {
        setStepDeletingId(null);
      }
    },
    [organization, mutateTemplates]
  );

  const setStepFormField = useCallback(
    <K extends keyof StepFormState>(key: K, value: StepFormState[K]) => {
      setStepForm((prev) => ({ ...prev, [key]: value }));
      setStepFormErrors((prev) => ({ ...prev, [key]: "" }));
    },
    []
  );

  return {
    flow,
    isLoading: flowLoading || templatesLoading || applicationsLoading,
    error: flowError || templatesError,
    mutateFlow,
    mutateTemplates,

    // tab
    activeTab,
    setActiveTab,

    // data
    steps,
    relatedJobs,
    summary,

    // step form
    stepDialogOpen,
    setStepDialogOpen,
    stepForm,
    setStepFormField,
    stepFormErrors,
    stepSaving,
    stepDeletingId,
    openAddStepDialog,
    openEditStepDialog,
    handleStepSave,
    handleStepDelete,
  };
}
