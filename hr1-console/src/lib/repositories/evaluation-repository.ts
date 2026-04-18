import type { SupabaseClient } from "@supabase/supabase-js";

// TODO(HR-28-followup): evaluation-repository を packages/ に共通化して
// hr1-employee-web 側との重複を解消する。現状は同一シグネチャでコピーしている。

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

// ─── Templates ───

export async function fetchTemplates(
  client: SupabaseClient,
  orgId: string,
  options?: { includeArchived?: boolean }
) {
  let query = client.from("evaluation_templates").select("*").eq("organization_id", orgId);
  if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchMultiRaterTemplates(
  client: SupabaseClient,
  orgId: string,
  options?: { includeArchived?: boolean }
) {
  let query = client
    .from("evaluation_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("evaluation_type", "multi_rater");
  if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchTemplateById(
  client: SupabaseClient,
  id: string,
  orgId: string,
  options?: { includeArchived?: boolean }
) {
  let query = client
    .from("evaluation_templates")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId);
  if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }
  return query.maybeSingle();
}

export async function fetchTemplateTitles(client: SupabaseClient, templateIds: string[]) {
  return client.from("evaluation_templates").select("id, title").in("id", templateIds);
}

export async function fetchTemplatesByTarget(
  client: SupabaseClient,
  orgId: string,
  targets: string[],
  options?: { includeArchived?: boolean }
) {
  let query = client
    .from("evaluation_templates")
    .select("*")
    .eq("organization_id", orgId)
    .in("target", targets);
  if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Criteria ───

export async function fetchCriteria(client: SupabaseClient, templateId: string) {
  const { data } = await client
    .from("evaluation_criteria")
    .select("*")
    .eq("template_id", templateId)
    .is("deleted_at", null)
    .order("sort_order");
  return data ?? [];
}

export async function fetchCriteriaByTemplates(client: SupabaseClient, templateIds: string[]) {
  return client
    .from("evaluation_criteria")
    .select("*")
    .in("template_id", templateIds)
    .is("deleted_at", null)
    .order("sort_order");
}

// ─── Anchors ───

export async function fetchAnchors(client: SupabaseClient, criterionIds: string[]) {
  return client
    .from("evaluation_anchors")
    .select("*")
    .in("criterion_id", criterionIds)
    .order("score_value");
}

// ─── Template edit RPCs (HR-28) ───
//
// 評価テンプレート詳細画面からの編集系は全て RPC 経由で実行する。
// 直接 INSERT/UPDATE/DELETE は RLS で拒否される（templates/criteria/anchors は
// authenticated には SELECT しか開かれていない）。

export interface EvaluationCriterionInput {
  label: string;
  description: string | null;
  score_type: "five_star" | "ten_point" | "text" | "select";
  options: string[] | null;
  weight: number;
  anchors: { score_value: number; description: string }[];
}

export async function rpcAddEvaluationCriterion(
  client: SupabaseClient,
  templateId: string,
  input: EvaluationCriterionInput
): Promise<string> {
  const { data, error } = await client.rpc("add_evaluation_criterion", {
    p_template_id: templateId,
    p_label: input.label,
    p_description: input.description,
    p_score_type: input.score_type,
    p_options: input.options,
    p_weight: input.weight,
    p_anchors: input.anchors,
  });
  if (error) throw error;
  if (!data) throw new Error("add_evaluation_criterion returned no id");
  return data as string;
}

export async function rpcUpdateEvaluationCriterion(
  client: SupabaseClient,
  criterionId: string,
  input: EvaluationCriterionInput
): Promise<void> {
  const { error } = await client.rpc("update_evaluation_criterion", {
    p_criterion_id: criterionId,
    p_label: input.label,
    p_description: input.description,
    p_score_type: input.score_type,
    p_options: input.options,
    p_weight: input.weight,
    p_anchors: input.anchors,
  });
  if (error) throw error;
}

export async function rpcDeleteEvaluationCriterion(
  client: SupabaseClient,
  criterionId: string
): Promise<void> {
  const { error } = await client.rpc("delete_evaluation_criterion", {
    p_criterion_id: criterionId,
  });
  if (error) throw error;
}

export async function rpcReorderEvaluationCriteria(
  client: SupabaseClient,
  templateId: string,
  criterionIds: string[]
): Promise<void> {
  const { error } = await client.rpc("reorder_evaluation_criteria", {
    p_template_id: templateId,
    p_criterion_ids: criterionIds,
  });
  if (error) throw error;
}

export async function rpcUpdateEvaluationTemplate(
  client: SupabaseClient,
  templateId: string,
  input: {
    title: string;
    description: string | null;
    evaluation_type?: "single" | "multi_rater";
    anonymity_mode?: "none" | "peer_only" | "full";
  }
): Promise<void> {
  const { error } = await client.rpc("update_evaluation_template", {
    p_template_id: templateId,
    p_title: input.title,
    p_description: input.description,
    p_evaluation_type: input.evaluation_type ?? null,
    p_anonymity_mode: input.anonymity_mode ?? null,
  });
  if (error) throw error;
}

export async function rpcPublishEvaluationTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await client.rpc("publish_evaluation_template", {
    p_template_id: templateId,
  });
  if (error) throw error;
}

export async function rpcArchiveEvaluationTemplate(
  client: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await client.rpc("archive_evaluation_template", {
    p_template_id: templateId,
  });
  if (error) throw error;
}

export async function rpcDuplicateEvaluationTemplate(
  client: SupabaseClient,
  templateId: string,
  newTitle: string
): Promise<string> {
  const { data, error } = await client.rpc("duplicate_evaluation_template", {
    p_template_id: templateId,
    p_new_title: newTitle,
  });
  if (error) throw error;
  if (!data) throw new Error("duplicate_evaluation_template returned no id");
  return data as string;
}

// ─── Evaluations ───

export async function fetchEvaluations(client: SupabaseClient, templateId: string, orgId: string) {
  return client
    .from("evaluations")
    .select("*")
    .eq("template_id", templateId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
}

export async function fetchEvaluationsByUser(
  client: SupabaseClient,
  orgId: string,
  targetUserId: string,
  applicationId?: string
) {
  let query = client
    .from("evaluations")
    .select("*, evaluation_templates(title), evaluator:evaluator_id(display_name, email)")
    .eq("organization_id", orgId)
    .eq("target_user_id", targetUserId);

  if (applicationId) {
    query = query.eq("application_id", applicationId);
  }

  return query.order("created_at", { ascending: false });
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 */
export async function insertEvaluation(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluations").insert(row);
}

/**
 * @deprecated `rpcSubmitAdHocEvaluation` を使うこと。
 */
export async function updateEvaluation(
  client: SupabaseClient,
  id: string,
  orgId: string,
  data: Record<string, unknown>
) {
  return client.from("evaluations").update(data).eq("id", id).eq("organization_id", orgId);
}

// ─── Scores ───

export async function fetchScores(client: SupabaseClient, evaluationIds: string[]) {
  return client.from("evaluation_scores").select("*").in("evaluation_id", evaluationIds);
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

// ─── Cycles ───

export async function fetchCycles(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("evaluation_cycles")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchCyclesByTemplate(
  client: SupabaseClient,
  templateId: string,
  orgId: string
) {
  return client
    .from("evaluation_cycles")
    .select("*")
    .eq("template_id", templateId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
}

export async function fetchCycleById(client: SupabaseClient, id: string, orgId: string) {
  return client
    .from("evaluation_cycles")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
}

export async function insertCycle(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluation_cycles").insert(row);
}

export async function updateCycle(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Record<string, unknown>
) {
  return client
    .from("evaluation_cycles")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
}

// ─── Assignments ───

export async function fetchAssignments(client: SupabaseClient, cycleId: string) {
  return client
    .from("evaluation_assignments")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("created_at");
}

export async function fetchAssignmentsByCycles(client: SupabaseClient, cycleIds: string[]) {
  return client
    .from("evaluation_assignments")
    .select("id, cycle_id, status")
    .in("cycle_id", cycleIds);
}

export async function insertAssignments(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_assignments").insert(rows);
}

export async function deleteAssignment(client: SupabaseClient, id: string) {
  return client.from("evaluation_assignments").delete().eq("id", id);
}

export async function deleteAssignments(client: SupabaseClient, ids: string[]) {
  return client.from("evaluation_assignments").delete().in("id", ids);
}

// ─── Profiles (shared queries) ───

export async function fetchProfiles(client: SupabaseClient, userIds: string[]) {
  return client.from("profiles").select("id, display_name, email").in("id", userIds);
}

export async function fetchProfilesWithRole(client: SupabaseClient, userIds: string[]) {
  return client.from("profiles").select("id, display_name, email, role").in("id", userIds);
}

// ─── Org members ───

export async function fetchOrgMembers(client: SupabaseClient, orgId: string) {
  return client
    .from("user_organizations")
    .select("profiles(id, display_name, email, role)")
    .eq("organization_id", orgId);
}

// ─── Departments ───

export async function fetchDepartments(client: SupabaseClient, orgId: string) {
  return client.from("departments").select("*").eq("organization_id", orgId).order("name");
}

export async function fetchEmployeeDepartments(client: SupabaseClient, departmentIds: string[]) {
  return client
    .from("employee_departments")
    .select("user_id, department_id")
    .in("department_id", departmentIds);
}
