"use client";

import { useCallback, useMemo, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as flowRepo from "@/lib/repositories/selection-flow-repository";
import * as templateRepo from "@/lib/repositories/selection-step-template-repository";
import * as applicationRepo from "@/lib/repositories/application-repository";
import { validators, validateForm, type ValidationErrors } from "@hr1/shared-ui";
import { StepStatus } from "@/lib/constants";
import type { Application, SelectionFlow, SelectionStepTemplate } from "@/types/database";

// ---------- data hooks ----------

function useFlowsList() {
  return useOrgQuery<SelectionFlow[]>("selection-flows", (orgId) =>
    flowRepo.findByOrg(getSupabase(), orgId)
  );
}

function useTemplatesList() {
  return useOrgQuery<SelectionStepTemplate[]>("selection-step-templates", (orgId) =>
    templateRepo.findByOrg(getSupabase(), orgId)
  );
}

function useApplicationsList() {
  return useOrgQuery<Application[]>("applications", (orgId) =>
    applicationRepo.fetchApplications(getSupabase(), orgId)
  );
}

// ---------- types ----------

export interface TemplateWithCounts extends SelectionStepTemplate {
  inProgressCount: number;
  completedCount: number;
}

export interface FlowWithSteps extends SelectionFlow {
  steps: TemplateWithCounts[];
}

interface FlowFormState {
  id: string | null;
  name: string;
  description: string;
}

const EMPTY_FLOW_FORM: FlowFormState = {
  id: null,
  name: "",
  description: "",
};

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

export function useSelectionStepsPage() {
  const { organization } = useOrg();
  const {
    data: flows = [],
    isLoading: flowsLoading,
    error: flowsError,
    mutate: mutateFlows,
  } = useFlowsList();
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useTemplatesList();
  const { data: applications = [], isLoading: applicationsLoading } = useApplicationsList();

  // --- flow form ---
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [flowForm, setFlowForm] = useState<FlowFormState>(EMPTY_FLOW_FORM);
  const [flowFormErrors, setFlowFormErrors] = useState<ValidationErrors>({});
  const [flowSaving, setFlowSaving] = useState(false);
  const [flowDeletingId, setFlowDeletingId] = useState<string | null>(null);

  // --- step form ---
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [stepForm, setStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);
  const [stepFormErrors, setStepFormErrors] = useState<ValidationErrors>({});
  const [stepSaving, setStepSaving] = useState(false);
  const [stepDeletingId, setStepDeletingId] = useState<string | null>(null);

  // --- expanded flows ---
  const [expandedFlowIds, setExpandedFlowIds] = useState<Set<string>>(new Set());

  const toggleFlowExpand = useCallback((flowId: string) => {
    setExpandedFlowIds((prev) => {
      const next = new Set(prev);
      if (next.has(flowId)) next.delete(flowId);
      else next.add(flowId);
      return next;
    });
  }, []);

  // ---------- computed data ----------

  const templatesWithCounts = useMemo<TemplateWithCounts[]>(() => {
    const inProgress = new Map<string, number>();
    const completed = new Map<string, number>();

    for (const app of applications) {
      if (app.status === "rejected" || app.status === "withdrawn") continue;
      for (const step of app.application_steps ?? []) {
        if (step.status === StepStatus.InProgress) {
          inProgress.set(step.label, (inProgress.get(step.label) ?? 0) + 1);
        } else if (step.status === StepStatus.Completed) {
          completed.set(step.label, (completed.get(step.label) ?? 0) + 1);
        }
      }
    }

    return templates.map((t) => ({
      ...t,
      inProgressCount: inProgress.get(t.name) ?? 0,
      completedCount: completed.get(t.name) ?? 0,
    }));
  }, [templates, applications]);

  const flowsWithSteps = useMemo<FlowWithSteps[]>(() => {
    return flows.map((flow) => ({
      ...flow,
      steps: templatesWithCounts
        .filter((t) => t.flow_id === flow.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [flows, templatesWithCounts]);

  const unassignedSteps = useMemo(
    () => templatesWithCounts.filter((t) => !t.flow_id),
    [templatesWithCounts]
  );

  // ---------- flow CRUD ----------

  const openAddFlowDialog = useCallback(() => {
    setFlowForm(EMPTY_FLOW_FORM);
    setFlowFormErrors({});
    setFlowDialogOpen(true);
  }, []);

  const openEditFlowDialog = useCallback((flow: SelectionFlow) => {
    setFlowForm({
      id: flow.id,
      name: flow.name,
      description: flow.description ?? "",
    });
    setFlowFormErrors({});
    setFlowDialogOpen(true);
  }, []);

  const handleFlowSave = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };

    const errors = validateForm(
      { name: [validators.required("フロー名"), validators.maxLength(100, "フロー名")] },
      { name: flowForm.name }
    );
    if (errors) {
      setFlowFormErrors(errors);
      return { success: false };
    }
    setFlowFormErrors({});

    setFlowSaving(true);
    try {
      if (flowForm.id) {
        await flowRepo.updateFlow(getSupabase(), flowForm.id, organization.id, {
          name: flowForm.name.trim(),
          description: flowForm.description.trim() || null,
        });
      } else {
        await flowRepo.createFlow(getSupabase(), {
          organization_id: organization.id,
          name: flowForm.name.trim(),
          description: flowForm.description.trim() || null,
        });
      }
      setFlowDialogOpen(false);
      mutateFlows();
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存に失敗しました";
      return { success: false, error: message };
    } finally {
      setFlowSaving(false);
    }
  }, [organization, flowForm, mutateFlows]);

  const handleFlowDelete = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false, error: "組織が見つかりません" };
      setFlowDeletingId(id);
      try {
        await flowRepo.deleteFlow(getSupabase(), id, organization.id);
        mutateFlows();
        mutateTemplates();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "削除に失敗しました";
        return { success: false, error: message };
      } finally {
        setFlowDeletingId(null);
      }
    },
    [organization, mutateFlows, mutateTemplates]
  );

  // ---------- step CRUD ----------

  const openAddStepDialog = useCallback(
    (flowId: string) => {
      const flowSteps = templates.filter((t) => t.flow_id === flowId);
      const nextOrder = flowSteps.reduce((max, t) => Math.max(max, t.sort_order), -1) + 1;
      setStepForm({ ...EMPTY_STEP_FORM, flow_id: flowId, sort_order: String(nextOrder) });
      setStepFormErrors({});
      setStepDialogOpen(true);
    },
    [templates]
  );

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

  const setFlowFormField = useCallback(
    <K extends keyof FlowFormState>(key: K, value: FlowFormState[K]) => {
      setFlowForm((prev) => ({ ...prev, [key]: value }));
      setFlowFormErrors((prev) => ({ ...prev, [key]: "" }));
    },
    []
  );

  const setStepFormField = useCallback(
    <K extends keyof StepFormState>(key: K, value: StepFormState[K]) => {
      setStepForm((prev) => ({ ...prev, [key]: value }));
      setStepFormErrors((prev) => ({ ...prev, [key]: "" }));
    },
    []
  );

  return {
    organization,
    isLoading: flowsLoading || templatesLoading || applicationsLoading,
    error: flowsError || templatesError,
    mutateFlows,
    mutateTemplates,

    // flows
    flowsWithSteps,
    unassignedSteps,
    expandedFlowIds,
    toggleFlowExpand,

    // flow form
    flowDialogOpen,
    setFlowDialogOpen,
    flowForm,
    setFlowFormField,
    flowFormErrors,
    flowSaving,
    flowDeletingId,
    openAddFlowDialog,
    openEditFlowDialog,
    handleFlowSave,
    handleFlowDelete,

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
