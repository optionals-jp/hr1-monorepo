import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function fetchTemplates(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("evaluation_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchMultiRaterTemplates(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("evaluation_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("evaluation_type", "multi_rater")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchTemplateById(client: SupabaseClient, id: string, orgId: string) {
  return client
    .from("evaluation_templates")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
}

export async function fetchTemplateTitles(client: SupabaseClient, templateIds: string[]) {
  return client.from("evaluation_templates").select("id, title").in("id", templateIds);
}

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

/**
 * @deprecated `rpcCreateEvaluationTemplate` を使うこと。
 * 生の insert は uuid 採番・アトミシティの責務が呼び出し元にあり、非推奨。
 */
export async function insertTemplate(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluation_templates").insert(row);
}

/**
 * @deprecated RPC 化により補償 DELETE は不要。呼び出し元が残っていなければ削除予定。
 */
export async function deleteTemplate(client: SupabaseClient, id: string, orgId: string) {
  return client.from("evaluation_templates").delete().eq("id", id).eq("organization_id", orgId);
}

export async function updateTemplate(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  data: Record<string, unknown>
) {
  return client
    .from("evaluation_templates")
    .update(data)
    .eq("id", id)
    .eq("organization_id", organizationId);
}

// ─── Criteria ───

export async function fetchCriteria(client: SupabaseClient, templateId: string) {
  const { data } = await client
    .from("evaluation_criteria")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order");
  return data ?? [];
}

export async function fetchCriteriaByTemplates(client: SupabaseClient, templateIds: string[]) {
  return client
    .from("evaluation_criteria")
    .select("*")
    .in("template_id", templateIds)
    .order("sort_order");
}

/**
 * @deprecated 新規テンプレート作成は `rpcCreateEvaluationTemplate` を使うこと。
 * 既存テンプレートへの criterion 追加用途ではまだ使われている（将来は専用 RPC 化予定）。
 */
export async function insertCriteria(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_criteria").insert(rows);
}

export async function deleteCriteria(client: SupabaseClient, ids: string[]) {
  return client.from("evaluation_criteria").delete().in("id", ids);
}

export async function updateCriterion(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("evaluation_criteria").update(data).eq("id", id);
}

// ─── Anchors ───

/**
 * @deprecated `rpcCreateEvaluationTemplate` を使うこと。
 */
export async function insertAnchors(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_anchors").insert(rows);
}

export async function fetchAnchors(client: SupabaseClient, criterionIds: string[]) {
  return client
    .from("evaluation_anchors")
    .select("*")
    .in("criterion_id", criterionIds)
    .order("score_value");
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
