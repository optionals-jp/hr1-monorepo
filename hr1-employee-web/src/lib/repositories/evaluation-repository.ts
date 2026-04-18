import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EvaluationCycle,
  EvaluationAssignment,
  EvaluationCriterion,
  EvaluationAnchor,
  Evaluation,
  EvaluationScore,
} from "@/types/database";

export async function fetchActiveCycles(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("evaluation_cycles")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["active", "closed", "finalized"])
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EvaluationCycle[];
}

export async function createCycle(
  client: SupabaseClient,
  params: {
    organization_id: string;
    title: string;
    description: string | null;
    template_id: string;
    start_date: string;
    end_date: string;
    status: string;
  }
): Promise<EvaluationCycle> {
  const { data, error } = await client
    .from("evaluation_cycles")
    .insert(params)
    .select("*")
    .single();
  if (error) throw error;
  return data as EvaluationCycle;
}

export async function fetchMyAssignments(client: SupabaseClient, cycleId: string, userId: string) {
  const { data, error } = await client
    .from("evaluation_assignments")
    .select(
      "*, target_profile:target_user_id(display_name, email), evaluator_profile:evaluator_id(display_name, email)"
    )
    .eq("cycle_id", cycleId)
    .or(`target_user_id.eq.${userId},evaluator_id.eq.${userId}`)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as EvaluationAssignment[];
}

export async function fetchAssignmentDetail(
  client: SupabaseClient,
  assignmentId: string,
  userId: string
) {
  const { data, error } = await client
    .from("evaluation_assignments")
    .select(
      "*, target_profile:target_user_id(display_name, email), evaluator_profile:evaluator_id(display_name, email), evaluation_cycles(*)"
    )
    .eq("id", assignmentId)
    .eq("evaluator_id", userId)
    .single();
  if (error) throw error;
  return data as EvaluationAssignment & {
    evaluation_cycles: EvaluationCycle;
  };
}

export async function fetchCriteriaForTemplate(client: SupabaseClient, templateId: string) {
  const { data, error } = await client
    .from("evaluation_criteria")
    .select("*, evaluation_anchors(*)")
    .eq("template_id", templateId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as (EvaluationCriterion & {
    evaluation_anchors: EvaluationAnchor[];
  })[];
}

export async function fetchExistingEvaluation(
  client: SupabaseClient,
  assignmentId: string,
  evaluatorId: string
) {
  const { data, error } = await client
    .from("evaluations")
    .select("*, evaluation_scores(*)")
    .eq("assignment_id", assignmentId)
    .eq("evaluator_id", evaluatorId)
    .maybeSingle();
  if (error) throw error;
  return data as (Evaluation & { evaluation_scores: EvaluationScore[] }) | null;
}

export async function createEvaluation(
  client: SupabaseClient,
  data: {
    organization_id: string;
    template_id: string;
    target_user_id: string;
    evaluator_id: string;
    cycle_id: string;
    rater_type: string;
    assignment_id: string;
  }
) {
  const { data: result, error } = await client
    .from("evaluations")
    .insert({ ...data, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return result.id as string;
}

export async function upsertScores(
  client: SupabaseClient,
  evaluationId: string,
  scores: {
    criterion_id: string;
    score: number | null;
    value: string | null;
    comment: string | null;
  }[]
) {
  const rows = scores.map((s) => ({
    evaluation_id: evaluationId,
    criterion_id: s.criterion_id,
    score: s.score,
    value: s.value,
    comment: s.comment,
  }));
  const { error } = await client
    .from("evaluation_scores")
    .upsert(rows, { onConflict: "evaluation_id,criterion_id" });
  if (error) throw error;
}

export async function saveOverallComment(
  client: SupabaseClient,
  evaluationId: string,
  comment: string | null
) {
  const { error } = await client
    .from("evaluations")
    .update({ overall_comment: comment })
    .eq("id", evaluationId);
  if (error) throw error;
}

export async function submitEvaluation(
  client: SupabaseClient,
  evaluationId: string,
  assignmentId: string
) {
  const { error: evalError } = await client
    .from("evaluations")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", evaluationId);
  if (evalError) throw evalError;

  const { error: assignError } = await client
    .from("evaluation_assignments")
    .update({ status: "submitted", evaluation_id: evaluationId })
    .eq("id", assignmentId);
  if (assignError) throw assignError;
}

// ─── Atomic RPCs (evaluation template + ad-hoc evaluation) ───

/**
 * `public.create_evaluation_template` RPC を呼び出して評価テンプレートを
 * 1 トランザクションで作成する。template / criteria / anchors を全てアトミックに
 * 作成し、id は DB 側の `gen_random_uuid()` で採番される。
 * 失敗時は Postgres 側でロールバックされるため、JS 側での補償 DELETE は不要。
 *
 * 権限: 自組織 admin のみ（RPC 内部でチェック）。
 */
export async function rpcCreateEvaluationTemplate(
  client: SupabaseClient,
  params: {
    organizationId: string;
    title: string;
    description: string;
    target: string;
    evaluationType: string;
    anonymityMode: string;
    criteria: unknown[]; // criteriaDraftsToRpcPayload(...) の戻り値
  }
): Promise<string> {
  const { data, error } = await client.rpc("create_evaluation_template", {
    p_organization_id: params.organizationId,
    p_title: params.title,
    p_description: params.description,
    p_target: params.target,
    p_evaluation_type: params.evaluationType,
    p_anonymity_mode: params.anonymityMode,
    p_criteria: params.criteria,
  });
  if (error) throw error;
  if (!data) throw new Error("create_evaluation_template returned no id");
  return data as string;
}

/**
 * `public.submit_ad_hoc_evaluation` RPC を呼び出してアドホック評価を作成/更新する。
 * evaluations 本体と evaluation_scores 行を 1 トランザクションで処理する。
 *
 * - `evaluationId` が null なら新規作成、非 null なら更新。
 * - 新規作成時の `evaluator_id` は RPC 内部で `auth.uid()` に強制設定される。
 *   クライアントからの偽装は不可。
 * - 更新時は既存スコアを全削除してから再挿入する（RPC 内部で実施）。
 */
export async function rpcSubmitAdHocEvaluation(
  client: SupabaseClient,
  params: {
    evaluationId: string | null;
    organizationId: string;
    templateId: string;
    targetUserId: string;
    applicationId: string | null;
    status: "draft" | "submitted";
    overallComment: string;
    scores: {
      criterion_id: string;
      score: number | null;
      value: string | null;
      comment: string | null;
    }[];
  }
): Promise<string> {
  const { data, error } = await client.rpc("submit_ad_hoc_evaluation", {
    p_evaluation_id: params.evaluationId,
    p_organization_id: params.organizationId,
    p_template_id: params.templateId,
    p_target_user_id: params.targetUserId,
    p_application_id: params.applicationId,
    p_status: params.status,
    p_overall_comment: params.overallComment,
    p_scores: params.scores,
  });
  if (error) throw error;
  if (!data) throw new Error("submit_ad_hoc_evaluation returned no id");
  return data as string;
}

// ─── Ad-hoc evaluation (for applicant/employee evaluation tab) ───

export async function fetchTemplatesByTarget(
  client: SupabaseClient,
  orgId: string,
  targets: string[]
) {
  const { data } = await client
    .from("evaluation_templates")
    .select("*")
    .eq("organization_id", orgId)
    .in("target", targets)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchTemplateById(client: SupabaseClient, id: string, orgId: string) {
  const { data } = await client
    .from("evaluation_templates")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
}

/**
 * @deprecated `rpcCreateEvaluationTemplate` を使うこと。
 * 生の insert は uuid 採番・アトミシティの責務が呼び出し元にあり、非推奨。
 */
export async function insertTemplate(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluation_templates").insert(row);
}

/**
 * @deprecated `rpcCreateEvaluationTemplate` を使うこと。
 */
export async function insertCriteria(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_criteria").insert(rows);
}

/**
 * @deprecated `rpcCreateEvaluationTemplate` を使うこと。
 */
export async function insertAnchors(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_anchors").insert(rows);
}

/**
 * @deprecated RPC 化により補償 DELETE は不要。呼び出し元が残っていなければ削除予定。
 */
export async function deleteTemplate(client: SupabaseClient, id: string, orgId: string) {
  return client.from("evaluation_templates").delete().eq("id", id).eq("organization_id", orgId);
}

export async function fetchCriteria(client: SupabaseClient, templateId: string) {
  const { data } = await client
    .from("evaluation_criteria")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order");
  return (data ?? []) as EvaluationCriterion[];
}

export async function fetchCriteriaByTemplates(client: SupabaseClient, templateIds: string[]) {
  return client
    .from("evaluation_criteria")
    .select("*")
    .in("template_id", templateIds)
    .order("sort_order");
}

export async function fetchAnchors(client: SupabaseClient, criterionIds: string[]) {
  return client
    .from("evaluation_anchors")
    .select("*")
    .in("criterion_id", criterionIds)
    .order("score_value");
}

export async function fetchEvaluationsByUser(
  client: SupabaseClient,
  orgId: string,
  targetUserId: string,
  applicationId?: string
) {
  let query = client
    .from("evaluations")
    .select(
      "*, evaluation_templates(title), evaluator:evaluator_id(display_name, email), evaluation_cycles(title), application:application_id(id, jobs(title))"
    )
    .eq("organization_id", orgId)
    .eq("target_user_id", targetUserId);

  if (applicationId) {
    query = query.eq("application_id", applicationId);
  }

  return query.order("created_at", { ascending: false });
}

export async function fetchScores(client: SupabaseClient, evaluationIds: string[]) {
  return client.from("evaluation_scores").select("*").in("evaluation_id", evaluationIds);
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 * 生の insert は uuid 採番・evaluator_id 強制・スコア整合性の責務が呼び出し元にあり、非推奨。
 */
export async function insertEvaluation(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluations").insert(row);
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 */
export async function updateEvaluationById(
  client: SupabaseClient,
  id: string,
  orgId: string,
  data: Record<string, unknown>
) {
  return client.from("evaluations").update(data).eq("id", id).eq("organization_id", orgId);
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 */
export async function insertScores(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_scores").insert(rows);
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 * evaluation_scores には DELETE ポリシーが無く、client からの直接 DELETE は
 * RLS で silent fail する。必ず RPC 経由で削除すること。
 */
export async function deleteScoresByEvaluation(client: SupabaseClient, evaluationId: string) {
  return client.from("evaluation_scores").delete().eq("evaluation_id", evaluationId);
}
