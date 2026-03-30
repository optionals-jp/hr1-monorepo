import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function insertTemplate(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluation_templates").insert(row);
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
  targetUserId: string
) {
  return client
    .from("evaluations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false });
}

export async function insertEvaluation(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("evaluations").insert(row);
}

// ─── Scores ───

export async function fetchScores(client: SupabaseClient, evaluationIds: string[]) {
  return client.from("evaluation_scores").select("*").in("evaluation_id", evaluationIds);
}

export async function insertScores(client: SupabaseClient, rows: Record<string, unknown>[]) {
  return client.from("evaluation_scores").insert(rows);
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
