import type { SupabaseClient } from "@supabase/supabase-js";
import type { PulseSurvey, PulseSurveyQuestion, PulseSurveyResponse } from "@/types/database";

export async function fetchActiveSurveys(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("pulse_surveys")
    .select("*, question_count:pulse_survey_questions(count)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("target", ["employee", "both"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    ...s,
    question_count: (s.question_count as unknown as { count: number }[])?.[0]?.count ?? 0,
  })) as PulseSurvey[];
}

export async function fetchQuestions(client: SupabaseClient, surveyId: string) {
  const { data, error } = await client
    .from("pulse_survey_questions")
    .select("*")
    .eq("survey_id", surveyId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as PulseSurveyQuestion[];
}

export async function fetchMyResponse(client: SupabaseClient, surveyId: string, userId: string) {
  const { data, error } = await client
    .from("pulse_survey_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as PulseSurveyResponse | null;
}

export async function submitResponse(
  client: SupabaseClient,
  data: {
    survey_id: string;
    organization_id: string;
    user_id: string;
    answers: { question_id: string; value: string }[];
  }
) {
  const { data: response, error: responseError } = await client
    .from("pulse_survey_responses")
    .insert({
      survey_id: data.survey_id,
      organization_id: data.organization_id,
      user_id: data.user_id,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (responseError) throw responseError;

  if (data.answers.length > 0) {
    const { error: answersError } = await client.from("pulse_survey_answers").insert(
      data.answers.map((a) => ({
        response_id: response.id,
        question_id: a.question_id,
        value: a.value,
      }))
    );
    if (answersError) throw answersError;
  }
}
