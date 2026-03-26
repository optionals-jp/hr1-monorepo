"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import type {
  Application,
  ApplicationStep,
  CustomForm,
  FormField,
  Interview,
} from "@/types/database";
import type {
  ActiveTab,
  FormSheetField,
  UseApplicationDetailReturn,
} from "@/features/applications/types";

/** リソース選択が必要なステップ種別 */
const RESOURCE_STEP_TYPES = ["form", "interview"] as const;

type ResourceStepType = (typeof RESOURCE_STEP_TYPES)[number];

function isResourceStepType(type: string): type is ResourceStepType {
  return (RESOURCE_STEP_TYPES as readonly string[]).includes(type);
}

export function useApplicationDetail(id: string): UseApplicationDetailReturn {
  const { organization } = useOrg();
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);

  // フォーム回答シートの状態
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [formSheetStep, setFormSheetStep] = useState<ApplicationStep | null>(null);
  const [formSheetFields, setFormSheetFields] = useState<FormSheetField[]>([]);
  const [formSheetLoading, setFormSheetLoading] = useState(false);

  // タブの状態
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  // リソース選択ダイアログの状態
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceDialogStep, setResourceDialogStep] = useState<ApplicationStep | null>(null);
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // 入社確定ダイアログの状態
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [converting, setConverting] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const { data } = await getSupabase()
      .from("applications")
      .select(
        "*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)"
      )
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

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

  // Realtime: application_steps の変更をリッスンして自動リロード
  useEffect(() => {
    const channel = getSupabase()
      .channel(`application_steps:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "application_steps",
          filter: `application_id=eq.${id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [id, load]);

  /** リソース選択ダイアログを開き、フォームまたは面接一覧を取得 */
  const openResourceDialog = useCallback(
    async (step: ApplicationStep) => {
      if (!organization) return;

      setResourceDialogStep(step);
      setResourcesLoading(true);
      setResourceDialogOpen(true);

      if (step.step_type === "form") {
        const { data } = await getSupabase()
          .from("custom_forms")
          .select("*")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        setForms(data ?? []);
      } else if (step.step_type === "interview") {
        const { data } = await getSupabase()
          .from("interviews")
          .select("*")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        setInterviews(data ?? []);
      }

      setResourcesLoading(false);
    },
    [organization]
  );

  /** リソースを選択してステップを開始 */
  const startStepWithResource = useCallback(
    async (resourceId: string) => {
      if (!resourceDialogStep) return;

      await getSupabase()
        .from("application_steps")
        .update({
          status: "in_progress",
          related_id: resourceId,
          started_at: new Date().toISOString(),
        })
        .eq("id", resourceDialogStep.id);

      setResourceDialogOpen(false);
      setResourceDialogStep(null);
      load();
    },
    [resourceDialogStep, load]
  );

  /** ステップを進行させる */
  const advanceStep = useCallback(
    async (step: ApplicationStep) => {
      try {
        if (step.status === "pending") {
          // リソース選択が必要なステップ種別の場合はダイアログを開く
          if (isResourceStepType(step.step_type)) {
            openResourceDialog(step);
            return;
          }

          // その他のステップは直接開始
          const { error } = await getSupabase()
            .from("application_steps")
            .update({
              status: "in_progress",
              started_at: new Date().toISOString(),
            })
            .eq("id", step.id);
          if (error) throw error;
        } else if (step.status === "in_progress") {
          const { error } = await getSupabase()
            .from("application_steps")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", step.id);
          if (error) throw error;

          // 次のステップを自動開始（step_order が連番でない場合にも対応）
          const nextStep = steps
            .filter((s) => s.step_order > step.step_order && s.status === "pending")
            .sort((a, b) => a.step_order - b.step_order)[0];
          if (nextStep) {
            // 次ステップがリソース選択を必要としない場合のみ自動開始
            if (!isResourceStepType(nextStep.step_type)) {
              await getSupabase()
                .from("application_steps")
                .update({
                  status: "in_progress",
                  started_at: new Date().toISOString(),
                })
                .eq("id", nextStep.id);
            }
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
    async (step: ApplicationStep) => {
      const { error } = await getSupabase()
        .from("application_steps")
        .update({ status: "skipped", completed_at: new Date().toISOString() })
        .eq("id", step.id);
      if (error) {
        console.error("ステップスキップエラー:", error);
        return;
      }
      load();
    },
    [load]
  );

  const unskipStep = useCallback(
    async (step: ApplicationStep) => {
      const { error } = await getSupabase()
        .from("application_steps")
        .update({ status: "pending", started_at: null, completed_at: null })
        .eq("id", step.id);
      if (error) {
        console.error("ステップ復元エラー:", error);
        return;
      }
      load();
    },
    [load]
  );

  /** 現在アクション可能なステップを判定（順序を強制） */
  const currentStepOrder = (() => {
    const inProgress = steps.find((s) => s.status === "in_progress");
    if (inProgress) return inProgress.step_order;
    const firstPending = steps.find((s) => s.status === "pending");
    if (firstPending) return firstPending.step_order;
    return null;
  })();

  const canActOnStep = useCallback(
    (step: ApplicationStep) => {
      if (step.status === "completed") return false;
      if (step.status === "skipped") return true;
      return step.step_order === currentStepOrder;
    },
    [currentStepOrder]
  );

  /** フォーム回答シートを開く */
  const openFormResponses = useCallback(
    async (step: ApplicationStep) => {
      if (!step.related_id || !application) return;
      setFormSheetStep(step);
      setFormSheetLoading(true);
      setFormSheetOpen(true);

      const [{ data: fieldsData }, { data: responsesData }] = await Promise.all([
        getSupabase()
          .from("form_fields")
          .select("*")
          .eq("form_id", step.related_id)
          .order("sort_order"),
        getSupabase()
          .from("form_responses")
          .select("*")
          .eq("form_id", step.related_id)
          .eq("applicant_id", application.applicant_id),
      ]);

      const answerMap: Record<string, string> = {};
      for (const r of responsesData ?? []) {
        answerMap[r.field_id] = Array.isArray(r.value)
          ? (r.value as string[]).join(", ")
          : String(r.value ?? "");
      }

      setFormSheetFields(
        (fieldsData ?? []).map((f) => ({ field: f as FormField, value: answerMap[f.id] ?? "-" }))
      );
      setFormSheetLoading(false);
    },
    [application]
  );

  const updateApplicationStatus = useCallback(
    async (status: string | null) => {
      if (!status) return;
      await getSupabase().from("applications").update({ status }).eq("id", id);
      setApplication((prev) =>
        prev ? { ...prev, status: status as Application["status"] } : prev
      );
    },
    [id]
  );

  const handleConvertToEmployee = useCallback(async () => {
    if (!application || !organization) return;
    setConverting(true);
    try {
      const supabase = getSupabase();
      const applicantId = application.applicant_id;

      // 1. プロフィールのロールを employee に変更し、入社日を設定
      await supabase
        .from("profiles")
        .update({ role: "employee", hire_date: hireDate })
        .eq("id", applicantId);

      // 2. user_organizations に登録されていなければ追加
      await supabase
        .from("user_organizations")
        .upsert(
          { user_id: applicantId, organization_id: organization.id },
          { onConflict: "user_id,organization_id" }
        );

      // 3. 通知を作成
      await supabase.from("notifications").insert({
        organization_id: organization.id,
        user_id: applicantId,
        type: "general",
        title: "入社が確定しました",
        body: `${hireDate} 付けで社員として登録されました。社員アプリからログインできます。`,
        is_read: false,
      });

      showToast("入社確定しました。応募者が社員として登録されました。");
      setConvertDialogOpen(false);
      load();
    } catch (e) {
      showToast(`エラーが発生しました: ${String(e)}`, "error");
    } finally {
      setConverting(false);
    }
  }, [application, organization, hireDate, showToast, load]);

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
    canActOnStep,
    currentStepOrder,

    updateApplicationStatus,

    load,
  };
}
