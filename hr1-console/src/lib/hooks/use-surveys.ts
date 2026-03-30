"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import * as repo from "@/lib/repositories/survey-repository";
import type { PulseSurvey, PulseSurveyQuestion, PulseSurveyResponse } from "@/types/database";

export function useSurveys() {
  return useOrgQuery<PulseSurvey[]>("pulse-surveys", (orgId) =>
    repo.fetchSurveys(getSupabase(), orgId)
  );
}

export function useSurveyDetail(id: string) {
  const { organization } = useOrg();
  const orgId = organization?.id;
  const surveyCacheKey = orgId ? `pulse-survey-${orgId}-${id}` : null;
  const questionsCacheKey = orgId ? `pulse-survey-questions-${orgId}-${id}` : null;
  const responsesCacheKey = orgId ? `pulse-survey-responses-${orgId}-${id}` : null;
  const memberCountCacheKey = orgId ? `org-member-count-${orgId}` : null;

  const surveyResult = useQuery<PulseSurvey>(surveyCacheKey, async () => {
    const { data } = await repo.fetchSurveyById(getSupabase(), id, organization!.id);
    return data;
  });

  const questionsResult = useQuery<PulseSurveyQuestion[]>(questionsCacheKey, async () => {
    return repo.fetchQuestions(getSupabase(), id);
  });

  const responsesResult = useQuery<PulseSurveyResponse[]>(responsesCacheKey, async () => {
    return repo.fetchResponses(getSupabase(), id);
  });

  const memberCountResult = useQuery<number>(memberCountCacheKey, async () => {
    return repo.fetchOrgMemberCount(getSupabase(), organization!.id);
  });

  return {
    survey: surveyResult.data,
    surveyLoading: surveyResult.isLoading,
    surveyError: surveyResult.error,
    mutateSurvey: surveyResult.mutate,
    questions: questionsResult.data ?? [],
    questionsLoading: questionsResult.isLoading,
    responses: responsesResult.data ?? [],
    responsesLoading: responsesResult.isLoading,
    totalTargetUsers: memberCountResult.data ?? 0,
    surveyCacheKey,
    questionsCacheKey,
    listCacheKey: orgId ? `pulse-surveys-${orgId}` : null,
  };
}

export async function createSurvey(
  orgId: string,
  data: { title: string; description: string; target: string; deadline: string }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { data: row, error } = await repo.insertSurvey(getSupabase(), {
      organization_id: orgId,
      title: data.title.trim(),
      description: data.description.trim() || null,
      target: data.target,
      deadline: data.deadline ? `${data.deadline}T23:59:59+09:00` : null,
    });
    if (error) return { success: false, error: "サーベイの作成に失敗しました" };
    return { success: true, id: row?.id };
  } catch {
    return { success: false, error: "サーベイの作成に失敗しました" };
  }
}

export async function saveQuestion(
  surveyId: string,
  editQuestion: PulseSurveyQuestion | null,
  data: {
    label: string;
    description: string;
    type: string;
    isRequired: boolean;
    options: string;
  },
  maxSortOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const options =
      data.type === "single_choice" || data.type === "multiple_choice"
        ? data.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : null;

    if (
      (data.type === "single_choice" || data.type === "multiple_choice") &&
      (!options || options.length === 0)
    ) {
      return { success: false, error: "選択肢を1つ以上入力してください" };
    }

    if (editQuestion) {
      const { error } = await repo.updateQuestion(client, editQuestion.id, {
        label: data.label.trim(),
        description: data.description.trim() || null,
        type: data.type,
        is_required: data.isRequired,
        options,
      });
      if (error) return { success: false, error: "質問の更新に失敗しました" };
    } else {
      const { error } = await repo.insertQuestion(client, {
        survey_id: surveyId,
        label: data.label.trim(),
        description: data.description.trim() || null,
        type: data.type,
        is_required: data.isRequired,
        options,
        sort_order: maxSortOrder + 1,
      });
      if (error) return { success: false, error: "質問の追加に失敗しました" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "質問の保存に失敗しました" };
  }
}

export async function deleteQuestionById(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteQuestion(getSupabase(), id);
  if (error) return { success: false, error: "質問の削除に失敗しました" };
  return { success: true };
}

export async function updateSurveyStatus(
  id: string,
  organizationId: string,
  newStatus: "active" | "closed"
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.updateSurveyStatus(getSupabase(), id, organizationId, newStatus);
  if (error) return { success: false, error: "ステータスの変更に失敗しました" };
  return { success: true };
}

export async function deleteSurveyById(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteSurvey(getSupabase(), id, organizationId);
  if (error) return { success: false, error: "サーベイの削除に失敗しました" };
  return { success: true };
}
