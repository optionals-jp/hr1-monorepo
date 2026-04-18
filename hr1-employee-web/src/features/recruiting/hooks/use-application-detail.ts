"use client";

import { useEffect, useState, useCallback } from "react";
import { useTabParam } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
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
  type FormSheetField,
} from "@/features/recruiting/application-rules";
import type { Application, ApplicationStep, CustomForm, Interview, Offer } from "@/types/database";

export type ApplicationDetailTab = "dashboard" | "steps" | "evaluation" | "history";

export function useApplicationDetail(id: string) {
  const { organization } = useOrg();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [formSheetStep, setFormSheetStep] = useState<ApplicationStep | null>(null);
  const [formSheetFields, setFormSheetFields] = useState<FormSheetField[]>([]);
  const [formSheetLoading, setFormSheetLoading] = useState(false);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);

  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useTabParam<ApplicationDetailTab>("dashboard");

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceDialogStep, setResourceDialogStep] = useState<ApplicationStep | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewDialogStep, setInterviewDialogStep] = useState<ApplicationStep | null>(null);
  const [interviewStarting, setInterviewStarting] = useState(false);

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
      const sortedSteps = ((data as unknown as Application).application_steps ?? []).sort(
        (a, b) => a.step_order - b.step_order
      );
      setSteps(sortedSteps);

      const offerData = await applicationRepository.fetchOffer(client, id);
      setOffer(offerData);
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

      const isForm = resourceDialogStep.step_type !== StepType.Interview;
      const { error } = await applicationRepository.updateStepStatus(
        getSupabase(),
        resourceDialogStep.id,
        {
          status: StepStatus.InProgress,
          form_id: isForm ? resourceId : null,
          interview_id: isForm ? null : resourceId,
          started_at: new Date().toISOString(),
        }
      );
      if (error) throw error;

      setResourceDialogOpen(false);
      setResourceDialogStep(null);
      load();
    },
    [resourceDialogStep, load]
  );

  const openInterviewDialog = useCallback((step: ApplicationStep) => {
    setInterviewDialogStep(step);
    setInterviewDialogOpen(true);
  }, []);

  const startInterviewStep = useCallback(async () => {
    if (!interviewDialogStep) return;
    setInterviewStarting(true);
    try {
      const { error } = await applicationRepository.updateStepStatus(
        getSupabase(),
        interviewDialogStep.id,
        {
          status: StepStatus.InProgress,
          started_at: new Date().toISOString(),
        }
      );
      if (error) throw error;
      setInterviewDialogOpen(false);
      setInterviewDialogStep(null);
      load();
    } catch (err) {
      console.error("面接ステップ開始エラー:", err);
    } finally {
      setInterviewStarting(false);
    }
  }, [interviewDialogStep, load]);

  const advanceStep = useCallback(
    async (step: ApplicationStep) => {
      try {
        const client = getSupabase();

        if (step.status === StepStatus.Pending) {
          if (step.step_type === StepType.Interview) {
            openInterviewDialog(step);
            return;
          }
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
      if (!step.form_id || !application) return;
      setFormSheetStep(step);
      setFormSheetLoading(true);
      setFormSheetOpen(true);

      const { fields, responses } = await applicationRepository.fetchFormResponses(
        getSupabase(),
        step.form_id,
        application.applicant_id
      );

      setFormSheetFields(buildFormSheetFields(fields, responses));
      setFormSheetLoading(false);
    },
    [application]
  );

  const updateApplicationSource = useCallback(
    async (source: string) => {
      if (!organization) return;
      const value = source === "" ? null : source;
      await applicationRepository.updateApplicationSource(
        getSupabase(),
        id,
        organization.id,
        value
      );
      setApplication((prev) => (prev ? { ...prev, source: value as Application["source"] } : prev));
    },
    [id, organization]
  );

  const updateApplicationStatus = useCallback(
    async (status: string | null) => {
      if (!status) return;
      if (!organization) return;

      // 内定ステータスへの変更はオファー条件ダイアログを表示
      if (status === "offered" && !offer) {
        setOfferDialogOpen(true);
        return;
      }

      // 不採用ステータスへの変更は不採用理由ダイアログを表示
      if (status === "rejected") {
        setRejectionDialogOpen(true);
        return;
      }

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
    [id, organization, offer]
  );

  const completeOfferStep = useCallback(async () => {
    const offerStep = steps.find(
      (s) => s.step_type === StepType.Offer && s.status === StepStatus.InProgress
    );
    if (!offerStep) return;
    await applicationRepository.updateStepStatus(getSupabase(), offerStep.id, {
      status: StepStatus.Completed,
      completed_at: new Date().toISOString(),
    });
  }, [steps]);

  const rejectApplicationWithReason = useCallback(
    async (data: { rejection_category?: string; rejection_reason?: string }) => {
      if (!organization) return;
      const { error } = await applicationRepository.rejectApplication(
        getSupabase(),
        id,
        organization.id,
        data
      );
      if (error) throw error;

      await completeOfferStep();

      setApplication((prev) =>
        prev
          ? {
              ...prev,
              status: "rejected" as Application["status"],
              rejection_category:
                (data.rejection_category as Application["rejection_category"]) ?? null,
              rejection_reason: data.rejection_reason ?? null,
            }
          : prev
      );
      setRejectionDialogOpen(false);
      load();
    },
    [id, organization, completeOfferStep, load]
  );

  // ---------- アドホックステップ ----------

  const [adHocDialogOpen, setAdHocDialogOpen] = useState(false);
  const [editingAdHocStep, setEditingAdHocStep] = useState<ApplicationStep | null>(null);
  const [adHocInsertBeforeStepId, setAdHocInsertBeforeStepId] = useState<string | null>(null);

  const openAddAdHocStep = useCallback((insertBeforeStepId?: string | null) => {
    setEditingAdHocStep(null);
    setAdHocInsertBeforeStepId(insertBeforeStepId ?? null);
    setAdHocDialogOpen(true);
  }, []);

  const openEditAdHocStep = useCallback((step: ApplicationStep) => {
    setEditingAdHocStep(step);
    setAdHocDialogOpen(true);
  }, []);

  /**
   * 挿入位置の step_order を求める。
   * - insertBeforeStepId 指定あり: そのステップの直前 (= 前ステップとの中間値)。先頭の場合は target - 1。
   * - insertAfterStepId 指定あり: そのステップの直後 (= 後続との中間値)。末尾なら after + 1。
   * - 両方 null: 「末尾」だが、オファーステップが存在する場合はオファーの直前へ。
   * step_order は numeric なので小数値を持てる。
   */
  const computeInsertStepOrder = useCallback(
    (params: { insertBeforeStepId?: string | null; insertAfterStepId?: string | null }): number => {
      if (steps.length === 0) return 1;
      const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);

      if (params.insertBeforeStepId) {
        const idx = sorted.findIndex((s) => s.id === params.insertBeforeStepId);
        if (idx === -1) {
          return sorted[sorted.length - 1].step_order + 1;
        }
        const target = sorted[idx];
        const prev = sorted[idx - 1];
        if (!prev) {
          return target.step_order - 1;
        }
        return (prev.step_order + target.step_order) / 2;
      }

      const insertAfterStepId = params.insertAfterStepId ?? null;
      if (!insertAfterStepId) {
        const offerIdx = sorted.findIndex((s) => s.step_type === StepType.Offer);
        if (offerIdx === -1) {
          return sorted[sorted.length - 1].step_order + 1;
        }
        const offerStep = sorted[offerIdx];
        const beforeStep = sorted[offerIdx - 1];
        if (!beforeStep) {
          return offerStep.step_order - 1;
        }
        return (beforeStep.step_order + offerStep.step_order) / 2;
      }

      const afterIdx = sorted.findIndex((s) => s.id === insertAfterStepId);
      if (afterIdx === -1) {
        return sorted[sorted.length - 1].step_order + 1;
      }
      const afterStep = sorted[afterIdx];
      const nextStep = sorted[afterIdx + 1];
      if (!nextStep) {
        return afterStep.step_order + 1;
      }
      return (afterStep.step_order + nextStep.step_order) / 2;
    },
    [steps]
  );

  const saveAdHocStep = useCallback(
    async (input: {
      step_type: string;
      label: string;
      form_id?: string | null;
      interview_id?: string | null;
      screening_type?: string | null;
      requires_review?: boolean;
      is_optional?: boolean;
      description?: string | null;
      insert_after_step_id?: string | null;
      insert_before_step_id?: string | null;
      default_duration_days?: number | null;
      deadline_at?: string | null;
    }): Promise<{ success: boolean; error?: string }> => {
      const client = getSupabase();
      const { insert_after_step_id, insert_before_step_id, ...rest } = input;
      try {
        if (editingAdHocStep) {
          const { error } = await applicationRepository.updateAdHocStep(
            client,
            editingAdHocStep.id,
            rest
          );
          if (error) throw error;
        } else {
          const { error } = await applicationRepository.insertAdHocStep(client, {
            application_id: id,
            step_order: computeInsertStepOrder({
              insertAfterStepId: insert_after_step_id ?? null,
              insertBeforeStepId: insert_before_step_id ?? null,
            }),
            created_by_user_id: user?.id ?? null,
            ...rest,
          });
          if (error) throw error;
        }
        setAdHocDialogOpen(false);
        setEditingAdHocStep(null);
        setAdHocInsertBeforeStepId(null);
        load();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "ステップの保存に失敗しました";
        return { success: false, error: message };
      }
    },
    [id, editingAdHocStep, computeInsertStepOrder, user, load]
  );

  const deleteAdHocStep = useCallback(
    async (step: ApplicationStep): Promise<{ success: boolean; error?: string }> => {
      if (step.source !== "ad_hoc" || step.status !== StepStatus.Pending) {
        return { success: false, error: "このステップは削除できません" };
      }
      const { error } = await applicationRepository.deleteAdHocStep(getSupabase(), step.id);
      if (error) {
        return { success: false, error: "ステップの削除に失敗しました" };
      }
      load();
      return { success: true };
    },
    [load]
  );

  const loadResourcesForAdHoc = useCallback(async () => {
    if (!organization) return;
    const client = getSupabase();
    setResourcesLoading(true);
    try {
      const [formData, interviewData] = await Promise.all([
        applicationRepository.fetchForms(client, organization.id),
        applicationRepository.fetchInterviews(client, organization.id),
      ]);
      setForms(formData);
      setInterviews(interviewData);
    } finally {
      setResourcesLoading(false);
    }
  }, [organization]);

  const createOfferAndUpdateStatus = useCallback(
    async (offerData: {
      salary?: string;
      start_date?: string;
      department?: string;
      notes?: string;
      expires_at?: string;
    }) => {
      if (!organization) return;
      const client = getSupabase();

      const { data: newOffer, error } = await applicationRepository.createOffer(client, {
        application_id: id,
        organization_id: organization.id,
        ...offerData,
      });
      if (error) throw error;

      await applicationRepository.updateApplicationStatus(client, id, organization.id, "offered");
      await completeOfferStep();

      setOffer(newOffer);
      setApplication((prev) =>
        prev ? { ...prev, status: "offered" as Application["status"] } : prev
      );
      setOfferDialogOpen(false);
      load();
    },
    [id, organization, completeOfferStep, load]
  );

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

    advanceStep,
    skipStep,
    unskipStep,

    interviewDialogOpen,
    setInterviewDialogOpen,
    interviewDialogStep,
    interviewStarting,
    startInterviewStep,
    canActOnStep: canActOnStepFn,
    currentStepOrder,

    updateApplicationStatus,
    updateApplicationSource,
    createOfferAndUpdateStatus,

    offer,
    offerDialogOpen,
    setOfferDialogOpen,

    rejectionDialogOpen,
    setRejectionDialogOpen,
    rejectApplicationWithReason,

    // アドホックステップ
    adHocDialogOpen,
    setAdHocDialogOpen,
    editingAdHocStep,
    adHocInsertBeforeStepId,
    openAddAdHocStep,
    openEditAdHocStep,
    saveAdHocStep,
    deleteAdHocStep,
    loadResourcesForAdHoc,

    load,
  };
}
