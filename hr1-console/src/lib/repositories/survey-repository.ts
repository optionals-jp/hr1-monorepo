import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Surveys ───

export async function fetchSurveys(client: SupabaseClient, orgId: string) {
  const { data } = await client
    .from("pulse_surveys")
    .select("*, pulse_survey_questions(id)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchSurveyById(client: SupabaseClient, id: string, orgId: string) {
  return client
    .from("pulse_surveys")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();
}

export async function insertSurvey(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("pulse_surveys").insert(row).select().single();
}

export async function updateSurveyStatus(
  client: SupabaseClient,
  id: string,
  organizationId: string,
  status: string
) {
  return client
    .from("pulse_surveys")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", organizationId);
}

export async function deleteSurvey(client: SupabaseClient, id: string, organizationId: string) {
  return client.from("pulse_surveys").delete().eq("id", id).eq("organization_id", organizationId);
}

// ─── Questions ───

export async function fetchQuestions(client: SupabaseClient, surveyId: string) {
  const { data } = await client
    .from("pulse_survey_questions")
    .select("*")
    .eq("survey_id", surveyId)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function insertQuestion(client: SupabaseClient, row: Record<string, unknown>) {
  return client.from("pulse_survey_questions").insert(row);
}

// pulse_survey_questions はorganization_idカラムを持たない（親テーブル pulse_surveys 経由でテナント分離）
export async function updateQuestion(
  client: SupabaseClient,
  id: string,
  data: Record<string, unknown>
) {
  return client.from("pulse_survey_questions").update(data).eq("id", id);
}

// pulse_survey_questions はorganization_idカラムを持たない（親テーブル pulse_surveys 経由でテナント分離）
export async function deleteQuestion(client: SupabaseClient, id: string) {
  return client.from("pulse_survey_questions").delete().eq("id", id);
}

// ─── Responses ───

export async function fetchResponses(client: SupabaseClient, surveyId: string) {
  const { data } = await client
    .from("pulse_survey_responses")
    .select("*, pulse_survey_answers(*)")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ─── Member count ───

export async function fetchOrgMemberCount(client: SupabaseClient, orgId: string) {
  const { count } = await client
    .from("user_organizations")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return count ?? 0;
}
