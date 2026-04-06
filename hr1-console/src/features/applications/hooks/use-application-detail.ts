"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrg } from "@/lib/org-context";
import { StepStatus, StepType } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth-context";
import * as applicationRepository from "@/lib/repositories/application-repository";
import * as activityLogRepo from "@/lib/repositories/activity-log-repository";
import {
  countEvaluationsByApplication,
  fetchEvaluationsByUser,
  fetchScores,
  fetchCriteriaByTemplates,
  fetchTemplateTitles,
} from "@/lib/repositories/evaluation-repository";
import type { Evaluation, EvaluationScore, EvaluationCriterion } from "@/types/database";
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
  const { user, profile: authProfile } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

  const applicationRef = useRef(application);
  applicationRef.current = application;

  const logActivity = useCallback(
    async (action: string, summary: string, detail?: Record<string, unknown>) => {
      if (!organization) return;
      try {
        await activityLogRepo.createActivityLog(getSupabase(), {
          organization_id: organization.id,
          actor_id: user?.id ?? null,
          actor_name: authProfile?.display_name ?? user?.email ?? null,
          action,
          category: "application",
          target_type: "application",
          target_id: id,
          parent_type: "job",
          parent_id: applicationRef.current?.job_id ?? null,
          summary,
          detail,
        });
      } catch {
        // ログ記録失敗は握りつぶす（業務処理をブロックしない）
      }
    },
    [organization, user, authProfile, id]
  );

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

  const [evaluationCount, setEvaluationCount] = useState(0);
  const [evaluationSummaries, setEvaluationSummaries] = useState<
    {
      id: string;
      template_title: string;
      evaluator_name: string;
      status: string;
      submitted_at: string | null;
      created_at: string;
      scores: EvaluationScore[];
      criteria: EvaluationCriterion[];
    }[]
  >([]);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const client = getSupabase();
    const [{ data }, evalCount] = await Promise.all([
      applicationRepository.fetchApplicationDetail(client, id, organization.id),
      countEvaluationsByApplication(client, organization.id, id),
    ]);

    if (data) {
      setApplication(data as unknown as Application);
      const sortedSteps = (data.application_steps ?? []).sort(
        (a: ApplicationStep, b: ApplicationStep) => a.step_order - b.step_order
      );
      setSteps(sortedSteps);

      // 評価サマリー取得
      const applicantId = (data as unknown as Application).applicant_id;
      const { data: evalData } = await fetchEvaluationsByUser(
        client,
        organization.id,
        applicantId,
        id
      );
      if (evalData && evalData.length > 0) {
        const templateIds = [...new Set(evalData.map((e) => e.template_id))];
        const evalIds = evalData.map((e) => e.id);
        const [{ data: crData }, { data: scoreData }, { data: tpls }] = await Promise.all([
          fetchCriteriaByTemplates(client, templateIds),
          fetchScores(client, evalIds),
          fetchTemplateTitles(client, templateIds),
        ]);
        const titleMap = new Map((tpls ?? []).map((t) => [t.id, t.title]));
        setEvaluationSummaries(
          evalData.map((e) => {
            const ev = e as Evaluation & {
              evaluator?: { display_name: string | null; email: string };
            };
            return {
              id: e.id,
              template_title: titleMap.get(e.template_id) ?? e.template_id,
              evaluator_name: ev.evaluator?.display_name ?? ev.evaluator?.email ?? "-",
              status: e.status,
              submitted_at: e.submitted_at,
              created_at: e.created_at,
              scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
              criteria: (crData ?? []).filter((c) => c.template_id === e.template_id),
            };
          })
        );
      } else {
        setEvaluationSummaries([]);
      }
    }
    setEvaluationCount(evalCount);
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

      const { error } = await applicationRepository.updateStepStatus(
        getSupabase(),
        resourceDialogStep.id,
        {
          status: StepStatus.InProgress,
          related_id: resourceId,
          started_at: new Date().toISOString(),
        }
      );
      if (error) throw error;

      logActivity("step_started", `${resourceDialogStep.label}を開始`, {
        step_id: resourceDialogStep.id,
        step_label: resourceDialogStep.label,
        resource_id: resourceId,
      });

      setResourceDialogOpen(false);
      setResourceDialogStep(null);
      load();
    },
    [resourceDialogStep, load, logActivity]
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
          logActivity("step_started", `${step.label}を開始`, {
            step_id: step.id,
            step_label: step.label,
          });
        } else if (step.status === StepStatus.InProgress) {
          const { error } = await applicationRepository.updateStepStatus(client, step.id, {
            status: StepStatus.Completed,
            completed_at: new Date().toISOString(),
          });
          if (error) throw error;
          logActivity("step_completed", `${step.label}を完了`, {
            step_id: step.id,
            step_label: step.label,
          });

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
    [steps, openResourceDialog, load, logActivity]
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
      logActivity("step_skipped", `${step.label}をスキップ`, {
        step_id: step.id,
        step_label: step.label,
      });
      load();
      return { success: true };
    },
    [load, logActivity]
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
      logActivity("step_unskipped", `${step.label}のスキップを取り消し`, {
        step_id: step.id,
        step_label: step.label,
      });
      load();
      return { success: true };
    },
    [load, steps, logActivity]
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
      const prevStatus = application?.status;
      await applicationRepository.updateApplicationStatus(
        getSupabase(),
        id,
        organization.id,
        status
      );
      setApplication((prev) =>
        prev ? { ...prev, status: status as Application["status"] } : prev
      );
      logActivity("status_changed", `ステータスを「${status}」に変更`, {
        from: prevStatus,
        to: status,
      });
    },
    [id, organization, application, logActivity]
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
      logActivity("converted_to_employee", "入社確定（社員に変換）", {
        hire_date: hireDate,
      });
      load();
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    } finally {
      setConverting(false);
    }
  }, [application, organization, hireDate, load, logActivity]);

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

    evaluationCount,
    evaluationSummaries,

    load,
  };
}
