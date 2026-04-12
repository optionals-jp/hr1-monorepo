"use client";

import { useCallback, useMemo, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useTabParam } from "@hr1/shared-ui";
import { getSupabase } from "@/lib/supabase/browser";
import * as evalRepo from "@/lib/repositories/evaluation-repository";
import { validators, validateForm, type ValidationErrors } from "@hr1/shared-ui";
import type { EvaluationCycle, EvaluationTemplate } from "@/types/database";

export const EVALUATION_TAB_STATUSES: Record<string, string[]> = {
  active: ["active"],
  closed: ["closed"],
  finalized: ["finalized"],
};

interface CycleFormState {
  id: string | null;
  title: string;
  description: string;
  template_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

const EMPTY_FORM: CycleFormState = {
  id: null,
  title: "",
  description: "",
  template_id: "",
  start_date: "",
  end_date: "",
  status: "active",
};

function useCyclesList() {
  return useOrgQuery<EvaluationCycle[]>("evaluation-cycles", (orgId) =>
    evalRepo.fetchActiveCycles(getSupabase(), orgId)
  );
}

function useEmployeeTemplates() {
  return useOrgQuery<EvaluationTemplate[]>("evaluation-templates-employee", async (orgId) => {
    const data = await evalRepo.fetchTemplatesByTarget(getSupabase(), orgId, ["employee", "both"]);
    return data as EvaluationTemplate[];
  });
}

/**
 * 評価サイクル一覧ページ用のフック。
 *
 * - サイクル一覧（ステータスタブでフィルタ）
 * - タイトル/説明での検索
 * - サイクル追加ダイアログのフォーム状態管理と作成処理
 */
export function useEvaluationsPage() {
  const { organization } = useOrg();
  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    mutate: mutateCycles,
  } = useCyclesList();
  const { data: templates = [], isLoading: templatesLoading } = useEmployeeTemplates();

  const [search, setSearch] = useState("");
  // URL ?tab= でタブ状態を保持。直リンク・戻る/進むで復元される。
  const [activeTab, setActiveTab] = useTabParam<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CycleFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const allowed = EVALUATION_TAB_STATUSES[activeTab] ?? [activeTab];
    const q = search.trim().toLowerCase();
    return cycles.filter((c) => {
      if (!allowed.includes(c.status)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [cycles, activeTab, search]);

  const openAddDialog = useCallback(() => {
    setForm({
      ...EMPTY_FORM,
      template_id: templates[0]?.id ?? "",
    });
    setFormErrors({});
    setDialogOpen(true);
  }, [templates]);

  const setFormField = useCallback(
    <K extends keyof CycleFormState>(key: K, value: CycleFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFormErrors((prev) => ({ ...prev, [key]: "" }));
    },
    []
  );

  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };

    const errors = validateForm(
      {
        title: [validators.required("タイトル"), validators.maxLength(200, "タイトル")],
        template_id: [validators.required("評価テンプレート")],
        start_date: [validators.required("開始日")],
        end_date: [validators.required("終了日")],
      },
      {
        title: form.title,
        template_id: form.template_id,
        start_date: form.start_date,
        end_date: form.end_date,
      }
    );
    if (errors) {
      setFormErrors(errors);
      return { success: false };
    }

    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      setFormErrors({ end_date: "終了日は開始日以降にしてください" });
      return { success: false };
    }

    setFormErrors({});
    setSaving(true);
    try {
      await evalRepo.createCycle(getSupabase(), {
        organization_id: organization.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        template_id: form.template_id,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
      });
      setDialogOpen(false);
      mutateCycles();
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "評価サイクルの作成に失敗しました";
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [organization, form, mutateCycles]);

  return {
    organization,
    cycles,
    filtered,
    templates,
    isLoading: cyclesLoading || templatesLoading,
    cyclesError,
    mutateCycles,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    dialogOpen,
    setDialogOpen,
    form,
    setFormField,
    formErrors,
    saving,
    openAddDialog,
    handleSave,
  };
}
