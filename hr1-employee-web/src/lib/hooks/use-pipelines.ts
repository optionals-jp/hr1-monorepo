"use client";

import { useEffect } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/pipeline-repository";
import type { CrmPipeline, CrmPipelineStage } from "@/types/database";

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
 */
export function getStagesFromPipeline(pipeline: CrmPipeline | null): CrmPipelineStage[] {
  return pipeline?.crm_pipeline_stages ?? [];
}

/**
 * ステージIDからステージ名を解決するヘルパー
 */
export function resolveStageLabel(
  stageId: string | null,
  stages: CrmPipelineStage[]
): string {
  if (!stageId) return "—";
  const found = stages.find((s) => s.id === stageId);
  return found?.name ?? "—";
}

/**
 * ステージIDからデフォルト確度を取得
 */
export function resolveStageProbability(
  stageId: string | null,
  stages: CrmPipelineStage[]
): number {
  if (!stageId) return 0;
  const found = stages.find((s) => s.id === stageId);
  return found?.probability_default ?? 0;
}
