"use client";

import { useEffect } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/pipeline-repository";
import type { CrmPipeline, CrmPipelineStage } from "@/types/database";
import { dealStageLabels, dealStageProbability } from "@/lib/constants";

/**
 * テナントの全パイプライン（ステージ含む）を取得
 */
export function usePipelines() {
  const { organization } = useOrg();
  const result = useOrgQuery("crm-pipelines", (orgId) => repo.fetchPipelines(getSupabase(), orgId));

  // パイプラインが存在しない場合はデフォルトを自動作成
  useEffect(() => {
    if (!organization) return;
    if (result.data && result.data.length === 0) {
      repo.ensureDefaultPipeline(getSupabase(), organization.id).then(() => {
        result.mutate();
      });
    }
  }, [organization, result.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}

/**
 * デフォルトパイプラインを取得
 */
export function useDefaultPipeline() {
  const { data: pipelines, ...rest } = usePipelines();
  const defaultPipeline = pipelines?.find((p) => p.is_default) ?? pipelines?.[0] ?? null;
  return { data: defaultPipeline, pipelines, ...rest };
}

/**
 * パイプラインのステージ配列を取得するユーティリティ
 * パイプラインが未設定の場合はレガシー定数からフォールバック
 */
export function getStagesFromPipeline(pipeline: CrmPipeline | null): CrmPipelineStage[] {
  if (pipeline?.crm_pipeline_stages && pipeline.crm_pipeline_stages.length > 0) {
    return pipeline.crm_pipeline_stages;
  }
  // フォールバック: レガシー定数からステージを生成
  return Object.entries(dealStageLabels).map(([key, label], i) => ({
    id: key,
    pipeline_id: "",
    name: label,
    color: ["#3b82f6", "#eab308", "#f97316", "#22c55e"][i] ?? "#3b82f6",
    probability_default: dealStageProbability[key] ?? 0,
    sort_order: i,
    created_at: "",
  }));
}

/**
 * ステージIDからステージ名を解決するヘルパー
 * stage_id が設定されている場合はパイプラインステージから、
 * されていない場合はレガシーstageカラム+定数から取得
 */
export function resolveStageLabel(
  stageKey: string,
  stageId: string | null,
  stages: CrmPipelineStage[]
): string {
  if (stageId) {
    const found = stages.find((s) => s.id === stageId);
    if (found) return found.name;
  }
  // レガシーフォールバック
  return dealStageLabels[stageKey] ?? stageKey;
}

/**
 * ステージIDまたはstageキーからデフォルト確度を取得
 */
export function resolveStageProbability(
  stageKey: string,
  stageId: string | null,
  stages: CrmPipelineStage[]
): number {
  if (stageId) {
    const found = stages.find((s) => s.id === stageId);
    if (found) return found.probability_default;
  }
  return dealStageProbability[stageKey] ?? 0;
}
