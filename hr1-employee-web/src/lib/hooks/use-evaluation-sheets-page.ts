"use client";

import { useCallback, useState } from "react";
import {
  type EvaluationCriterionDraft,
  createCriterionDraft,
  getDefaultAnchors,
} from "@hr1/shared-ui/lib/evaluation-draft";
import { useOrg } from "@/lib/org-context";
import {
  useApplicantEvaluationTemplates,
  createApplicantTemplate,
} from "@/lib/hooks/use-evaluations";

export { isNumericScoreType } from "@hr1/shared-ui/lib/evaluation-draft";
export type { EvaluationCriterionDraft } from "@hr1/shared-ui/lib/evaluation-draft";

/**
 * 候補者評価シート一覧ページ用のフック。
 *
 * - 評価シート一覧（候補者対象テンプレート）の取得
 * - 追加ダイアログのフォーム状態管理（タイトル・説明・評価項目）
 * - 作成処理（リポジトリ経由）
 */
export function useEvaluationSheetsPage() {
  const { organization } = useOrg();
  const {
    data: templates = [],
    isLoading,
    error,
    mutate,
  } = useApplicantEvaluationTemplates({ includeArchived: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<EvaluationCriterionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setCriteria([]);
  }, []);

  const openAddDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) resetForm();
    },
    [resetForm]
  );

  const addCriterion = useCallback(() => {
    setCriteria((prev) => [...prev, createCriterionDraft()]);
  }, []);

  const removeCriterion = useCallback((tempId: string) => {
    setCriteria((prev) => prev.filter((c) => c.tempId !== tempId));
  }, []);

  const updateCriterion = useCallback(
    (tempId: string, field: keyof EvaluationCriterionDraft, value: string | boolean) => {
      setCriteria((prev) =>
        prev.map((c) => {
          if (c.tempId !== tempId) return c;
          const updated = { ...c, [field]: value } as EvaluationCriterionDraft;
          if (field === "score_type" && typeof value === "string") {
            updated.anchors = getDefaultAnchors(value);
          }
          return updated;
        })
      );
    },
    []
  );

  const updateAnchor = useCallback(
    (tempId: string, scoreValue: number, anchorDescription: string) => {
      setCriteria((prev) =>
        prev.map((c) => {
          if (c.tempId !== tempId) return c;
          return {
            ...c,
            anchors: c.anchors.map((a) =>
              a.score_value === scoreValue ? { ...a, description: anchorDescription } : a
            ),
          };
        })
      );
    },
    []
  );

  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };
    if (!title.trim()) return { success: false, error: "タイトルを入力してください" };

    setSaving(true);
    try {
      const result = await createApplicantTemplate(organization.id, {
        title: title.trim(),
        description: description.trim(),
        criteria,
      });
      if (result.success) {
        setDialogOpen(false);
        resetForm();
        mutate();
        return { success: true };
      }
      return { success: false, error: result.error ?? "評価シートの作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, title, description, criteria, mutate, resetForm]);

  return {
    templates,
    isLoading,
    error,
    mutate,
    dialogOpen,
    setDialogOpen: handleDialogOpenChange,
    title,
    setTitle,
    description,
    setDescription,
    criteria,
    addCriterion,
    removeCriterion,
    updateCriterion,
    updateAnchor,
    saving,
    openAddDialog,
    handleSave,
  };
}
