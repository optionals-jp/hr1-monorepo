import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmPipeline, CrmPipelineStage } from "@/types/database";

// --- Pipelines ---

export async function fetchPipelines(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("crm_pipelines")
    .select("*, crm_pipeline_stages(*)")
    .eq("organization_id", organizationId)
    .order("sort_order");
  if (error) throw error;
  // ステージをsort_orderでソート
  const pipelines = (data ?? []) as CrmPipeline[];
  for (const p of pipelines) {
    if (p.crm_pipeline_stages) {
      p.crm_pipeline_stages.sort((a, b) => a.sort_order - b.sort_order);
    }
  }
  return pipelines;
}

export async function fetchDefaultPipeline(client: SupabaseClient, organizationId: string) {
  const { data } = await client
    .from("crm_pipelines")
    .select("*, crm_pipeline_stages(*)")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .single();
  if (data) {
    const pipeline = data as CrmPipeline;
    if (pipeline.crm_pipeline_stages) {
      pipeline.crm_pipeline_stages.sort((a, b) => a.sort_order - b.sort_order);
    }
    return pipeline;
  }
  return null;
}

export async function createPipeline(
  client: SupabaseClient,
  data: { organization_id: string; name: string; is_default?: boolean; sort_order?: number }
) {
  const { data: result, error } = await client.from("crm_pipelines").insert(data).select().single();
  if (error) throw error;
  return result as CrmPipeline;
}

export async function updatePipeline(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Partial<Pick<CrmPipeline, "name" | "is_default" | "sort_order">>
) {
  return client
    .from("crm_pipelines")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function deletePipeline(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("crm_pipelines").delete().eq("id", id).eq("organization_id", organizationId);
}

// --- Stages ---

export async function fetchStages(client: SupabaseClient, pipelineId: string) {
  const { data, error } = await client
    .from("crm_pipeline_stages")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CrmPipelineStage[];
}

export async function createStage(
  client: SupabaseClient,
  data: {
    pipeline_id: string;
    name: string;
    color?: string;
    probability_default?: number;
    sort_order?: number;
  }
) {
  const { data: result, error } = await client
    .from("crm_pipeline_stages")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as CrmPipelineStage;
}

export async function updateStage(
  client: SupabaseClient,
  id: string,
  pipelineId: string,
  data: Partial<Pick<CrmPipelineStage, "name" | "color" | "probability_default" | "sort_order">>
) {
  const { error } = await client
    .from("crm_pipeline_stages")
    .update(data)
    .eq("id", id)
    .eq("pipeline_id", pipelineId);
  if (error) throw error;
}

export async function deleteStage(client: SupabaseClient, id: string, pipelineId: string) {
  const { error } = await client
    .from("crm_pipeline_stages")
    .delete()
    .eq("id", id)
    .eq("pipeline_id", pipelineId);
  if (error) throw error;
}

export async function reorderStages(
  client: SupabaseClient,
  pipelineId: string,
  stages: { id: string; sort_order: number }[]
) {
  // 一括更新（並行実行）
  await Promise.all(
    stages.map((s) =>
      client
        .from("crm_pipeline_stages")
        .update({ sort_order: s.sort_order })
        .eq("id", s.id)
        .eq("pipeline_id", pipelineId)
    )
  );
}

// --- デフォルトパイプライン初期化 ---

const DEFAULT_STAGES = [
  { name: "初回接触", color: "#3b82f6", probability_default: 10, sort_order: 0 },
  { name: "提案", color: "#eab308", probability_default: 30, sort_order: 1 },
  { name: "交渉", color: "#f97316", probability_default: 60, sort_order: 2 },
  { name: "クロージング", color: "#22c55e", probability_default: 90, sort_order: 3 },
];

export async function ensureDefaultPipeline(client: SupabaseClient, organizationId: string) {
  // 既にパイプラインがあればスキップ
  const { data: existing } = await client
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);
  if (existing && existing.length > 0) return;

  // デフォルトパイプライン作成
  const pipeline = await createPipeline(client, {
    organization_id: organizationId,
    name: "デフォルト",
    is_default: true,
    sort_order: 0,
  });

  // デフォルトステージ作成
  await Promise.all(
    DEFAULT_STAGES.map((s) => createStage(client, { pipeline_id: pipeline.id, ...s }))
  );
}
