"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import {
  type EvaluationCriterionDraft,
  createCriterionDraft,
  getDefaultAnchors,
  criteriaDraftsToRpcPayload,
} from "@hr1/shared-ui/lib/evaluation-draft";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import { mapRpcError } from "@/lib/rpc-error";
import * as evalRepo from "@/lib/repositories/evaluation-repository";
import { loadApplicantTemplateDetail } from "@/lib/hooks/use-evaluations";
import type { EvaluationTemplate, EvaluationCriterion, EvaluationAnchor } from "@/types/database";

export { isNumericScoreType } from "@hr1/shared-ui/lib/evaluation-draft";
export type { EvaluationCriterionDraft } from "@hr1/shared-ui/lib/evaluation-draft";

export type EvaluationTemplateDetail = {
  template: EvaluationTemplate | null;
  criteria: EvaluationCriterion[];
  anchors: EvaluationAnchor[];
};

type MutationResult = { success: boolean; error?: string };

function draftFromCriterion(
  c: EvaluationCriterion,
  anchors: EvaluationAnchor[]
): EvaluationCriterionDraft {
  const matchedAnchors = anchors
    .filter((a) => a.criterion_id === c.id)
    .sort((a, b) => a.score_value - b.score_value);
  const scoreType = c.score_type;
  const defaults = getDefaultAnchors(scoreType);
  // 既存の anchor を score_value 順にデフォルト枠へマージ（不足分は空で埋める）
  const mergedAnchors =
    defaults.length > 0
      ? defaults.map((d) => {
          const existing = matchedAnchors.find((a) => a.score_value === d.score_value);
          return existing
            ? { score_value: existing.score_value, description: existing.description ?? "" }
            : d;
        })
      : matchedAnchors.map((a) => ({
          score_value: a.score_value,
          description: a.description ?? "",
        }));

  return {
    tempId: c.id,
    label: c.label,
    description: c.description ?? "",
    score_type: scoreType,
    options: (c.options ?? []).join("\n"),
    weight: c.weight.toString(),
    anchors: mergedAnchors,
    showAnchors: false,
  };
}

/**
 * 評価テンプレート詳細ページ用のフック。
 *
 * - テンプレート / 評価項目 / アンカー を取得
 * - 追加・編集ダイアログの下書きフォーム状態を管理
 * - 各 RPC 呼び出し（追加・編集・削除・並び替え・メタ更新・公開・アーカイブ・複製）
 *
 * いずれの書込も evaluation-repository の rpc* ラッパ経由で実行する。
 * published テンプレートへの破壊的変更は RPC 側で拒否される。
 */
export function useEvaluationTemplateDetail(templateId: string) {
  const { organization } = useOrg();
  const { mutate: globalMutate } = useSWRConfig();
  const key =
    organization && templateId ? `eval-template-detail-${organization.id}-${templateId}` : null;

  const { data, isLoading, error, mutate } = useQuery<EvaluationTemplateDetail>(key, async () => {
    return await loadApplicantTemplateDetail(organization!.id, templateId);
  });

  // 各 mutation 成功後にテンプレート一覧キャッシュも再取得させるヘルパ。
  // `applicant-eval-templates[-all]` は `useOrgQuery` 内で内部的に
  // 組織 ID プレフィックスを付与して SWR キーに落とされるため、部分一致で
  // invalidate する (単一 key の直接 match ではヒットしない場合がある)。
  const invalidateAll = useCallback(async () => {
    await Promise.all([
      mutate(),
      globalMutate(
        (k) =>
          typeof k === "string" &&
          (k.startsWith("applicant-eval-templates-all") || k.startsWith("applicant-eval-templates"))
      ),
    ]);
  }, [mutate, globalMutate]);

  const template = data?.template ?? null;
  const criteria = useMemo(() => data?.criteria ?? [], [data]);
  const anchors = useMemo(() => data?.anchors ?? [], [data]);

  // ─── 追加 / 編集ダイアログ state ───
  type DialogMode = { kind: "closed" } | { kind: "add" } | { kind: "edit"; criterionId: string };

  const [dialogMode, setDialogMode] = useState<DialogMode>({ kind: "closed" });
  const [draft, setDraft] = useState<EvaluationCriterionDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const openAddCriterionDialog = useCallback(() => {
    setDraft(createCriterionDraft());
    setDialogMode({ kind: "add" });
  }, []);

  const openEditCriterionDialog = useCallback(
    (criterionId: string) => {
      const target = criteria.find((c) => c.id === criterionId);
      if (!target) return;
      setDraft(draftFromCriterion(target, anchors));
      setDialogMode({ kind: "edit", criterionId });
    },
    [criteria, anchors]
  );

  const closeDialog = useCallback(() => {
    setDialogMode({ kind: "closed" });
    setDraft(null);
  }, []);

  const updateDraftField = useCallback(
    (field: keyof EvaluationCriterionDraft, value: string | boolean) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [field]: value } as EvaluationCriterionDraft;
        if (field === "score_type" && typeof value === "string") {
          updated.anchors = getDefaultAnchors(value);
        }
        return updated;
      });
    },
    []
  );

  const updateDraftAnchor = useCallback((scoreValue: number, description: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        anchors: prev.anchors.map((a) =>
          a.score_value === scoreValue ? { ...a, description } : a
        ),
      };
    });
  }, []);

  // ─── mutations ───

  const saveCriterionDialog = useCallback(async (): Promise<MutationResult> => {
    if (!draft) return { success: false, error: "フォームが初期化されていません" };
    if (!draft.label.trim()) return { success: false, error: "ラベルを入力してください" };

    const [payload] = criteriaDraftsToRpcPayload([draft]);
    const input: evalRepo.EvaluationCriterionInput = {
      label: payload.label,
      description: payload.description,
      score_type: payload.score_type as evalRepo.EvaluationCriterionInput["score_type"],
      options: payload.options,
      weight: payload.weight,
      anchors: payload.anchors,
    };

    setSaving(true);
    try {
      if (dialogMode.kind === "add") {
        await evalRepo.rpcAddEvaluationCriterion(getSupabase(), templateId, input);
      } else if (dialogMode.kind === "edit") {
        await evalRepo.rpcUpdateEvaluationCriterion(getSupabase(), dialogMode.criterionId, input);
      } else {
        return { success: false, error: "ダイアログが開いていません" };
      }
      await invalidateAll();
      closeDialog();
      return { success: true };
    } catch (err) {
      console.error("saveCriterionDialog failed", err);
      return { success: false, error: mapRpcError(err, "評価項目の保存に失敗しました") };
    } finally {
      setSaving(false);
    }
  }, [draft, dialogMode, templateId, invalidateAll, closeDialog]);

  const deleteCriterion = useCallback(
    async (criterionId: string): Promise<MutationResult> => {
      try {
        await evalRepo.rpcDeleteEvaluationCriterion(getSupabase(), criterionId);
        await invalidateAll();
        return { success: true };
      } catch (err) {
        console.error("deleteCriterion failed", err);
        return { success: false, error: mapRpcError(err, "評価項目の削除に失敗しました") };
      }
    },
    [invalidateAll]
  );

  const reorderCriteria = useCallback(
    async (orderedIds: string[]): Promise<MutationResult> => {
      try {
        await evalRepo.rpcReorderEvaluationCriteria(getSupabase(), templateId, orderedIds);
        await invalidateAll();
        return { success: true };
      } catch (err) {
        console.error("reorderCriteria failed", err);
        return { success: false, error: mapRpcError(err, "並び順の更新に失敗しました") };
      }
    },
    [templateId, invalidateAll]
  );

  const updateTemplateMeta = useCallback(
    async (input: {
      title: string;
      description: string | null;
      evaluation_type?: "single" | "multi_rater";
      anonymity_mode?: "none" | "peer_only" | "full";
    }): Promise<MutationResult> => {
      try {
        await evalRepo.rpcUpdateEvaluationTemplate(getSupabase(), templateId, input);
        await invalidateAll();
        return { success: true };
      } catch (err) {
        console.error("updateTemplateMeta failed", err);
        return { success: false, error: mapRpcError(err, "テンプレートの更新に失敗しました") };
      }
    },
    [templateId, invalidateAll]
  );

  const publishTemplate = useCallback(async (): Promise<MutationResult> => {
    try {
      await evalRepo.rpcPublishEvaluationTemplate(getSupabase(), templateId);
      await invalidateAll();
      return { success: true };
    } catch (err) {
      console.error("publishTemplate failed", err);
      return { success: false, error: mapRpcError(err, "公開に失敗しました") };
    }
  }, [templateId, invalidateAll]);

  const archiveTemplate = useCallback(async (): Promise<MutationResult> => {
    try {
      await evalRepo.rpcArchiveEvaluationTemplate(getSupabase(), templateId);
      await invalidateAll();
      return { success: true };
    } catch (err) {
      console.error("archiveTemplate failed", err);
      return { success: false, error: mapRpcError(err, "アーカイブに失敗しました") };
    }
  }, [templateId, invalidateAll]);

  const duplicateTemplate = useCallback(
    async (newTitle: string): Promise<{ success: boolean; error?: string; newId?: string }> => {
      try {
        const newId = await evalRepo.rpcDuplicateEvaluationTemplate(
          getSupabase(),
          templateId,
          newTitle
        );
        // 複製先は新規テンプレなので一覧キャッシュも更新する
        await invalidateAll();
        return { success: true, newId };
      } catch (err) {
        console.error("duplicateTemplate failed", err);
        return { success: false, error: mapRpcError(err, "複製に失敗しました") };
      }
    },
    [templateId, invalidateAll]
  );

  // テンプレートが切り替わったら開いているダイアログを閉じる
  useEffect(() => {
    setDialogMode({ kind: "closed" });
    setDraft(null);
  }, [templateId]);

  const isPublished = template?.status === "published";
  const isArchived = template?.status === "archived";
  const isDraft = template?.status === "draft";

  return {
    // data
    template,
    criteria,
    anchors,
    isLoading,
    error,
    mutate,

    // status flags
    isPublished,
    isArchived,
    isDraft,

    // dialog state
    dialogMode,
    draft,
    saving,
    openAddCriterionDialog,
    openEditCriterionDialog,
    closeDialog,
    updateDraftField,
    updateDraftAnchor,

    // mutations
    saveCriterionDialog,
    deleteCriterion,
    reorderCriteria,
    updateTemplateMeta,
    publishTemplate,
    archiveTemplate,
    duplicateTemplate,
  };
}
