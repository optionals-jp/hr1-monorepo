"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as surveyRepo from "@/lib/repositories/survey-repository";
import type { PulseSurveyQuestion, PulseSurveyResponse } from "@/types/database";

export function useSurveyQuestions(surveyId: string) {
  return useQuery<PulseSurveyQuestion[]>(`survey-questions-${surveyId}`, () =>
    surveyRepo.fetchQuestions(getSupabase(), surveyId)
  );
}

export function useMySurveyResponse(surveyId: string) {
  const { user } = useAuth();
  const key = user ? `my-survey-response-${surveyId}-${user.id}` : null;
  return useQuery<PulseSurveyResponse | null>(key, () =>
    surveyRepo.fetchMyResponse(getSupabase(), surveyId, user!.id)
  );
}

export function useSubmitSurvey() {
  const { user } = useAuth();
  const { organization } = useOrg();

  const submit = async (surveyId: string, answers: { question_id: string; value: string }[]) => {
    if (!user || !organization) return;
    await surveyRepo.submitResponse(getSupabase(), {
      survey_id: surveyId,
      organization_id: organization.id,
      user_id: user.id,
      answers,
    });
  };

  return { submit };
}
