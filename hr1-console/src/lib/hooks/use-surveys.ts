"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { mutate as swrMutate } from "swr";
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

type Tab = "questions" | "responses" | "analytics";

export function useSurveyDetailPage(id: string) {
  const { organization } = useOrg();

  const detail = useSurveyDetail(id);

  // タブ
  const [tab, setTab] = useState<Tab>("questions");

  // 質問編集パネル
  const [qEditOpen, setQEditOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<PulseSurveyQuestion | null>(null);
  const [qSaving, setQSaving] = useState(false);
  const [qDeleting, setQDeleting] = useState(false);

  // 質問フォーム
  const [qLabel, setQLabel] = useState("");
  const [qDescription, setQDescription] = useState("");
  const [qType, setQType] = useState<string>("rating");
  const [qRequired, setQRequired] = useState(true);
  const [qOptions, setQOptions] = useState("");

  // ステータス変更のローディング
  const [statusUpdating, setStatusUpdating] = useState(false);

  function openCreateQuestion() {
    setEditQuestion(null);
    setQLabel("");
    setQDescription("");
    setQType("rating");
    setQRequired(true);
    setQOptions("");
    setQEditOpen(true);
  }

  function openEditQuestion(q: PulseSurveyQuestion) {
    setEditQuestion(q);
    setQLabel(q.label);
    setQDescription(q.description ?? "");
    setQType(q.type);
    setQRequired(q.is_required);
    setQOptions(q.options ? (q.options as string[]).join("\n") : "");
    setQEditOpen(true);
  }

  async function handleSaveQuestion(): Promise<{ success: boolean; error?: string }> {
    if (!qLabel.trim()) return { success: false };
    setQSaving(true);
    const maxOrder =
      detail.questions.length > 0 ? Math.max(...detail.questions.map((q) => q.sort_order)) : -1;
    const result = await saveQuestion(
      id,
      editQuestion,
      {
        label: qLabel,
        description: qDescription,
        type: qType,
        isRequired: qRequired,
        options: qOptions,
      },
      maxOrder
    );
    if (result.success) {
      await swrMutate(detail.questionsCacheKey);
      setQEditOpen(false);
    }
    setQSaving(false);
    return result;
  }

  async function handleDeleteQuestion(): Promise<{ success: boolean; error?: string }> {
    if (!editQuestion) return { success: false };
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    setQDeleting(true);
    const result = await deleteQuestionById(editQuestion.id);
    if (result.success) {
      await swrMutate(detail.questionsCacheKey);
      setQEditOpen(false);
    }
    setQDeleting(false);
    return result;
  }

  async function updateStatus(
    newStatus: "active" | "closed"
  ): Promise<{ success: boolean; error?: string }> {
    if (!detail.survey || statusUpdating) return { success: false };
    if (!organization) return { success: false };
    setStatusUpdating(true);
    const result = await updateSurveyStatus(detail.survey.id, organization.id, newStatus);
    if (result.success) {
      await swrMutate(detail.surveyCacheKey);
      await swrMutate(detail.listCacheKey);
    }
    setStatusUpdating(false);
    return result;
  }

  async function handleDeleteSurvey(): Promise<{ success: boolean; error?: string }> {
    if (!detail.survey) return { success: false };
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    if (!organization) return { success: false };
    const result = await deleteSurveyById(detail.survey.id, organization.id);
    if (result.success) {
      await swrMutate(detail.listCacheKey);
    }
    return result;
  }

  const completedCount = detail.responses.filter((r) => r.completed_at).length;

  return {
    ...detail,
    tab,
    setTab,
    qEditOpen,
    setQEditOpen,
    editQuestion,
    qSaving,
    qDeleting,
    qLabel,
    setQLabel,
    qDescription,
    setQDescription,
    qType,
    setQType,
    qRequired,
    setQRequired,
    qOptions,
    setQOptions,
    statusUpdating,
    openCreateQuestion,
    openEditQuestion,
    handleSaveQuestion,
    handleDeleteQuestion,
    updateStatus,
    handleDeleteSurvey,
    completedCount,
  };
}

export function useSurveyCreatePanel() {
  const { organization } = useOrg();
  const router = useRouter();
  const {
    data: surveys = [],
    isLoading,
    error: surveysError,
    mutate: mutateSurveys,
  } = useSurveys();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<string>("employee");
  const [deadline, setDeadline] = useState("");

  function openCreate() {
    setTitle("");
    setDescription("");
    setTarget("employee");
    setDeadline("");
    setEditOpen(true);
  }

  async function handleSave(): Promise<{ success: boolean; error?: string; id?: string }> {
    if (!organization || !title.trim()) return { success: false };
    setSaving(true);
    const result = await createSurvey(organization.id, {
      title,
      description,
      target,
      deadline,
    });
    if (result.success) {
      await mutateSurveys();
      setEditOpen(false);
      if (result.id) {
        router.push(`/surveys/${result.id}`);
      }
    }
    setSaving(false);
    return result.success
      ? { success: true, id: result.id }
      : { success: false, error: result.error ?? "サーベイの作成に失敗しました" };
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return {
    surveys,
    isLoading,
    surveysError,
    mutateSurveys,
    editOpen,
    setEditOpen,
    saving,
    title,
    setTitle,
    description,
    setDescription,
    target,
    setTarget,
    deadline,
    setDeadline,
    openCreate,
    handleSave,
    todayStr,
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
