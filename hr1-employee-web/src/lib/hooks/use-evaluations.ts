"use client";

import {
  criteriaDraftsToRpcPayload,
  type EvaluationCriterionDraft,
} from "@hr1/shared-ui/lib/evaluation-draft";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as evalRepo from "@/lib/repositories/evaluation-repository";
import type {
  EvaluationCycle,
  EvaluationAssignment,
  Evaluation,
  EvaluationTemplate,
  EvaluationCriterion,
  EvaluationScore,
  EvaluationAnchor,
} from "@/types/database";

export function useEvaluationCycles() {
  return useOrgQuery<EvaluationCycle[]>("evaluation-cycles", (orgId) =>
    evalRepo.fetchActiveCycles(getSupabase(), orgId)
  );
}

export function useMyAssignments(cycleId: string | null) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key =
    cycleId && user && organization
      ? `my-eval-assignments-${organization.id}-${cycleId}-${user.id}`
      : null;

  return useQuery<EvaluationAssignment[]>(key, () =>
    evalRepo.fetchMyAssignments(getSupabase(), cycleId!, user!.id)
  );
}

// ─── Applicant evaluation templates (recruiting context) ───

export function useApplicantEvaluationTemplates() {
  return useOrgQuery<EvaluationTemplate[]>("applicant-eval-templates", async (orgId) => {
    const data = await evalRepo.fetchTemplatesByTarget(getSupabase(), orgId, ["applicant"]);
    return data as EvaluationTemplate[];
  });
}

/**
 * 候補者向け評価テンプレートを作成する。
 * `create_evaluation_template` RPC を呼び出し、template / criteria / anchors を
 * 1 トランザクションで作成する。id は DB 側で採番される。
 */
export async function createApplicantTemplate(
  orgId: string,
  data: {
    title: string;
    description: string;
    criteria: EvaluationCriterionDraft[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await evalRepo.rpcCreateEvaluationTemplate(getSupabase(), {
      organizationId: orgId,
      title: data.title,
      description: data.description,
      target: "applicant",
      evaluationType: "single",
      anonymityMode: "none",
      criteria: criteriaDraftsToRpcPayload(data.criteria),
    });
    return { success: true };
  } catch (err) {
    console.error("createApplicantTemplate failed", err);
    return { success: false, error: "評価シートの作成に失敗しました" };
  }
}

// ─── Ad-hoc evaluation tab helpers (applicant/employee details) ───

export async function loadEvaluationTabData(
  orgId: string,
  targetUserId: string,
  targetType: string,
  applicationId?: string
) {
  const client = getSupabase();

  const templates = await evalRepo.fetchTemplatesByTarget(client, orgId, [targetType, "both"]);

  const { data: evalData } = await evalRepo.fetchEvaluationsByUser(
    client,
    orgId,
    targetUserId,
    applicationId
  );

  let evaluations: (Evaluation & {
    evaluator_name: string;
    scores: EvaluationScore[];
    criteria: EvaluationCriterion[];
    template_title: string;
    cycle_title: string | null;
    job_title: string | null;
  })[] = [];

  if (evalData && evalData.length > 0) {
    const templateIds = [...new Set(evalData.map((e) => e.template_id))];
    const evalIds = evalData.map((e) => e.id);

    const [{ data: crData }, { data: scoreData }] = await Promise.all([
      evalRepo.fetchCriteriaByTemplates(client, templateIds),
      evalRepo.fetchScores(client, evalIds),
    ]);

    evaluations = evalData.map((e) => {
      const ev = e as Evaluation & {
        evaluation_templates?: { title: string };
        evaluator?: { display_name: string | null; email: string };
        evaluation_cycles?: { title: string } | null;
        application?: { id: string; jobs?: { title: string } | null } | null;
      };
      return {
        ...e,
        evaluator_name: ev.evaluator?.display_name ?? ev.evaluator?.email ?? e.evaluator_id,
        scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
        criteria: (crData ?? []).filter(
          (c: EvaluationCriterion) => c.template_id === e.template_id
        ),
        template_title:
          ev.evaluation_templates?.title ??
          templates.find((t) => t.id === e.template_id)?.title ??
          e.template_id,
        cycle_title: ev.evaluation_cycles?.title ?? null,
        job_title: ev.application?.jobs?.title ?? null,
      };
    });
  }

  return { templates, evaluations };
}

export async function loadTemplateCriteria(templateId: string) {
  const client = getSupabase();
  const cr = await evalRepo.fetchCriteria(client, templateId);

  let anchors: Awaited<ReturnType<typeof evalRepo.fetchAnchors>>["data"] = [];
  if (cr.length > 0) {
    const { data: anchorData } = await evalRepo.fetchAnchors(
      client,
      cr.map((c) => c.id)
    );
    anchors = anchorData ?? [];
  }

  return { criteria: cr, anchors: anchors ?? [] };
}

/**
 * 候補者向け評価テンプレートの詳細画面用ローダー。
 * テンプレート本体 / 評価項目 / アンカーを並列に取得する。
 */
export async function loadApplicantTemplateDetail(orgId: string, templateId: string) {
  const client = getSupabase();
  const [template, criteria] = await Promise.all([
    evalRepo.fetchTemplateById(client, templateId, orgId),
    evalRepo.fetchCriteria(client, templateId),
  ]);

  let anchors: EvaluationAnchor[] = [];
  if (criteria.length > 0) {
    const { data: anchorData } = await evalRepo.fetchAnchors(
      client,
      criteria.map((c) => c.id)
    );
    anchors = (anchorData as EvaluationAnchor[] | null) ?? [];
  }

  return {
    template: template as EvaluationTemplate | null,
    criteria,
    anchors,
  };
}

/**
 * アドホック評価（候補者/社員詳細ページからの直接評価）を作成または更新する。
 * `submit_ad_hoc_evaluation` RPC により evaluations 本体とスコア行を
 * 1 トランザクションで処理する。id は全て DB 側で採番される。
 *
 * `userId` パラメータは過去互換のため受け取るが、RPC 側で `auth.uid()` を
 * 強制するため参照しない（なりすまし防止）。
 */
export async function submitAdHocEvaluation(
  orgId: string,
  _userId: string,
  data: {
    evaluationId?: string;
    templateId: string;
    targetUserId: string;
    applicationId?: string;
    status: "draft" | "submitted";
    overallComment: string;
    scores: { criterion_id: string; score: number | null; value: string; comment: string }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await evalRepo.rpcSubmitAdHocEvaluation(getSupabase(), {
      evaluationId: data.evaluationId ?? null,
      organizationId: orgId,
      templateId: data.templateId,
      targetUserId: data.targetUserId,
      applicationId: data.applicationId ?? null,
      status: data.status,
      overallComment: data.overallComment,
      scores: data.scores.map((s) => ({
        criterion_id: s.criterion_id,
        score: s.score,
        value: s.value || null,
        comment: s.comment || null,
      })),
    });
    return { success: true };
  } catch (err) {
    console.error("submitAdHocEvaluation failed", err);
    return { success: false, error: "評価の保存に失敗しました" };
  }
}
