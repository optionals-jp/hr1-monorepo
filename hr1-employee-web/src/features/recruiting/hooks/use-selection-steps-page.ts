"use client";

import { useCallback, useMemo, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { getSupabase } from "@/lib/supabase/browser";
import * as templateRepo from "@/lib/repositories/selection-step-template-repository";
import * as applicationRepo from "@/lib/repositories/application-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { StepStatus } from "@/lib/constants";
import type { Application, SelectionStepTemplate } from "@/types/database";

/** タブで使うステップ種別値（"all" は全表示） */
export const TEMPLATE_TAB_ALL = "all";

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

export interface TemplateWithCounts extends SelectionStepTemplate {
  inProgressCount: number;
  completedCount: number;
}

interface FormState {
  id: string | null;
  name: string;
  step_type: string;
  description: string;
  sort_order: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  step_type: "screening",
  description: "",
  sort_order: "0",
};

/**
 * 選考ステップテンプレート管理ページ用のフック。
 *
 * - テンプレートの CRUD
 * - 種別タブ / 名前検索でのフィルタリング
 * - 各テンプレートに紐づく応募数（name で application_steps とマッチング）の集計
 */
export function useSelectionStepsPage() {
  const { organization } = useOrg();
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useTemplatesList();
  const { data: applications = [], isLoading: applicationsLoading } = useApplicationsList();

  const [search, setSearch] = useState("");
  // URL ?tab= でタブ状態を保持。直リンク・戻る/進むで復元される。
  const [typeFilter, setTypeFilter] = useTabParam<string>(TEMPLATE_TAB_ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * application_steps を走査して、テンプレート名ごとに
   * inProgress / completed の件数を集計する。
   * （テンプレートと application_steps.label の一致で紐付け）
   */
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

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return templatesWithCounts.filter((t) => {
      if (typeFilter !== TEMPLATE_TAB_ALL && t.step_type !== typeFilter) return false;
      if (!s) return true;
      return (
        t.name.toLowerCase().includes(s) || (t.description?.toLowerCase().includes(s) ?? false)
      );
    });
  }, [templatesWithCounts, typeFilter, search]);

  const openAddDialog = useCallback(() => {
    const nextOrder = templates.reduce((max, t) => Math.max(max, t.sort_order), -1) + 1;
    setForm({ ...EMPTY_FORM, sort_order: String(nextOrder) });
    setFormErrors({});
    setDialogOpen(true);
  }, [templates]);

  const openEditDialog = useCallback((template: SelectionStepTemplate) => {
    setForm({
      id: template.id,
      name: template.name,
      step_type: template.step_type,
      description: template.description ?? "",
      sort_order: String(template.sort_order),
    });
    setFormErrors({});
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };

    const errors = validateForm(
      {
        name: [validators.required("ステップ名"), validators.maxLength(100, "ステップ名")],
        step_type: [validators.required("種別")],
      },
      { name: form.name, step_type: form.step_type }
    );
    if (errors) {
      setFormErrors(errors);
      return { success: false };
    }
    setFormErrors({});

    const sortOrderNum = Number(form.sort_order);
    const sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : 0;

    setSaving(true);
    try {
      if (form.id) {
        await templateRepo.updateTemplate(getSupabase(), form.id, organization.id, {
          name: form.name.trim(),
          step_type: form.step_type,
          description: form.description.trim() || null,
          sort_order: sortOrder,
        });
      } else {
        await templateRepo.createTemplate(getSupabase(), {
          organization_id: organization.id,
          name: form.name.trim(),
          step_type: form.step_type,
          description: form.description.trim() || null,
          sort_order: sortOrder,
        });
      }
      setDialogOpen(false);
      mutateTemplates();
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存に失敗しました";
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [organization, form, mutateTemplates]);

  const handleDelete = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (!organization) return { success: false, error: "組織が見つかりません" };
      setDeletingId(id);
      try {
        await templateRepo.deleteTemplate(getSupabase(), id, organization.id);
        mutateTemplates();
        return { success: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "削除に失敗しました";
        return { success: false, error: message };
      } finally {
        setDeletingId(null);
      }
    },
    [organization, mutateTemplates]
  );

  const setFormField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  return {
    organization,
    templates,
    isLoading: templatesLoading || applicationsLoading,
    error: templatesError,
    mutateTemplates,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filtered,
    dialogOpen,
    setDialogOpen,
    form,
    setFormField,
    formErrors,
    saving,
    deletingId,
    openAddDialog,
    openEditDialog,
    handleSave,
    handleDelete,
  };
}
