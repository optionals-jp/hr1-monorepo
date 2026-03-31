"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrg } from "@/lib/org-context";
import { StepStatus, StepType } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicationRepository from "@/lib/repositories/application-repository";
import {
  isResourceStepType,
  canUnskipStep,
  getCurrentStepOrder,
  canActOnStep,
  findNextAutoStartStep,
  buildFormSheetFields,
} from "@/features/applications/rules";
import type { Application, ApplicationStep, CustomForm, Interview } from "@/types/database";
import type {
  ActiveTab,
  FormSheetField,
  UseApplicationDetailReturn,
} from "@/features/applications/types";

export function useApplicationDetail(id: string): UseApplicationDetailReturn {
  const { organization } = useOrg();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [formSheetStep, setFormSheetStep] = useState<ApplicationStep | null>(null);
  const [formSheetFields, setFormSheetFields] = useState<FormSheetField[]>([]);
  const [formSheetLoading, setFormSheetLoading] = useState(false);

  const [activeTab, setActiveTab] = useTabParam<ActiveTab>("dashboard");

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceDialogStep, setResourceDialogStep] = useState<ApplicationStep | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const client = getSupabase();
    const { data } = await applicationRepository.fetchApplicationDetail(
      client,
      id,
      organization.id
    );

    if (data) {
      setApplication(data as unknown as Application);
      const sortedSteps = (data.application_steps ?? []).sort(
        (a: ApplicationStep, b: ApplicationStep) => a.step_order - b.step_order
      );
      setSteps(sortedSteps);
    }
    setLoading(false);
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    load();
  }, [load, organization]);

  useEffect(() => {
    const client = getSupabase();
    const channel = applicationRepository.subscribeToStepChanges(client, id, load);
    return () => {
      client.removeChannel(channel);
    };
  }, [id, load]);

  const openResourceDialog = useCallback(
    async (step: ApplicationStep) => {
      if (!organization) return;
      const client = getSupabase();

      setResourceDialogStep(step);
      setResourcesLoading(true);
      setResourceDialogOpen(true);

      if (step.step_type === StepType.Form) {
        const data = await applicationRepository.fetchForms(client, organization.id);
        setForms(data);
      } else if (step.step_type === StepType.Interview) {
        const data = await applicationRepository.fetchInterviews(client, organization.id);
        setInterviews(data);
      }

      setResourcesLoading(false);
    },
    [organization]
  );

  const startStepWithResource = useCallback(
    async (resourceId: string) => {
      if (!resourceDialogStep) return;

      await applicationRepository.updateStepStatus(getSupabase(), resourceDialogStep.id, {
        status: StepStatus.InProgress,
        related_id: resourceId,
        started_at: new Date().toISOString(),
      });

      setResourceDialogOpen(false);
      setResourceDialogStep(null);
      load();
    },
    [resourceDialogStep, load]
  );

  const advanceStep = useCallback(
    async (step: ApplicationStep) => {
      try {
        const client = getSupabase();

        if (step.status === StepStatus.Pending) {
          if (isResourceStepType(step.step_type)) {
            openResourceDialog(step);
            return;
          }

          const { error } = await applicationRepository.updateStepStatus(client, step.id, {
            status: StepStatus.InProgress,
            started_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else if (step.status === StepStatus.InProgress) {
          const { error } = await applicationRepository.updateStepStatus(client, step.id, {
            status: StepStatus.Completed,
            completed_at: new Date().toISOString(),
          });
          if (error) throw error;

          const nextStep = findNextAutoStartStep(steps, step.step_order);
          if (nextStep && !isResourceStepType(nextStep.step_type)) {
            await applicationRepository.updateStepStatus(client, nextStep.id, {
              status: StepStatus.InProgress,
              started_at: new Date().toISOString(),
            });
          }
        }
        load();
      } catch (err) {
        console.error("ステップ更新エラー:", err);
      }
    },
    [steps, openResourceDialog, load]
  );

  const skipStep = useCallback(
    async (step: ApplicationStep): Promise<{ success: boolean; error?: string }> => {
      const { error } = await applicationRepository.updateStepStatus(getSupabase(), step.id, {
        status: StepStatus.Skipped,
        completed_at: new Date().toISOString(),
      });
      if (error) {
        return { success: false, error: "ステップのスキップに失敗しました" };
      }
      load();
      return { success: true };
    },
    [load]
  );

  const unskipStep = useCallback(
    async (step: ApplicationStep): Promise<{ success: boolean; error?: string }> => {
      if (!canUnskipStep(step, steps)) {
        return { success: false, error: "後続ステップが完了済みのため元に戻せません" };
      }

      const { error } = await applicationRepository.updateStepStatus(getSupabase(), step.id, {
        status: StepStatus.Pending,
        started_at: null,
        completed_at: null,
      });
      if (error) {
        return { success: false, error: "ステップの復元に失敗しました" };
      }
      load();
      return { success: true };
    },
    [load, steps]
  );

  const currentStepOrder = getCurrentStepOrder(steps);

  const canActOnStepFn = useCallback(
    (step: ApplicationStep) => canActOnStep(step, currentStepOrder),
    [currentStepOrder]
  );

  const openFormResponses = useCallback(
    async (step: ApplicationStep) => {
      if (!step.related_id || !application) return;
      setFormSheetStep(step);
      setFormSheetLoading(true);
      setFormSheetOpen(true);

      const { fields, responses } = await applicationRepository.fetchFormResponses(
        getSupabase(),
        step.related_id,
        application.applicant_id
      );

      setFormSheetFields(buildFormSheetFields(fields, responses));
      setFormSheetLoading(false);
    },
    [application]
  );

  const updateApplicationStatus = useCallback(
    async (status: string | null) => {
      if (!status) return;
      if (!organization) return;
      await applicationRepository.updateApplicationStatus(
        getSupabase(),
        id,
        organization.id,
        status
      );
      setApplication((prev) =>
        prev ? { ...prev, status: status as Application["status"] } : prev
      );
    },
    [id, organization]
  );

  const handleConvertToEmployee = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!application || !organization) return { success: false };
    setConverting(true);
    try {
      await applicationRepository.convertToEmployee(
        getSupabase(),
        application.applicant_id,
        organization.id,
        hireDate
      );
      setConvertDialogOpen(false);
      load();
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    } finally {
      setConverting(false);
    }
  }, [application, organization, hireDate, load]);

  return {
    application,
    steps,
    loading,
    activeTab,
    setActiveTab,

    formSheetOpen,
    setFormSheetOpen,
    formSheetStep,
    formSheetFields,
    formSheetLoading,
    openFormResponses,

    resourceDialogOpen,
    setResourceDialogOpen,
    resourceDialogStep,
    forms,
    interviews,
    resourcesLoading,
    startStepWithResource,

    convertDialogOpen,
    setConvertDialogOpen,
    hireDate,
    setHireDate,
    converting,
    handleConvertToEmployee,

    advanceStep,
    skipStep,
    unskipStep,
    canActOnStep: canActOnStepFn,
    currentStepOrder,

    updateApplicationStatus,

    load,
  };
}
