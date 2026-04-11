"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/evaluation-repository";
import type {
  EvaluationTemplate,
  EvaluationCriterion,
  EvaluationCycle,
  Evaluation,
  EvaluationScore,
  EvaluationAssignment,
  Profile,
  Department,
} from "@/types/database";

// ─── Template detail ───

export interface EvalWithScores extends Evaluation {
  target_name: string;
  evaluator_name: string;
  scores: EvaluationScore[];
}

export interface TemplateDetailData {
  template: EvaluationTemplate | null;
  criteria: EvaluationCriterion[];
  evaluations: EvalWithScores[];
  cycles: EvaluationCycle[];
}

export async function loadTemplateDetail(id: string, orgId: string): Promise<TemplateDetailData> {
  const client = getSupabase();

  const [{ data: tplData }, crData, { data: evalData }] = await Promise.all([
    repo.fetchTemplateById(client, id, orgId),
    repo.fetchCriteria(client, id),
    repo.fetchEvaluations(client, id, orgId),
  ]);

  let evaluations: EvalWithScores[] = [];

  if (evalData && evalData.length > 0) {
    const userIds = [...new Set(evalData.flatMap((e) => [e.target_user_id, e.evaluator_id]))];
    const evalIds = evalData.map((e) => e.id);

    const [{ data: profiles }, { data: scoreData }] = await Promise.all([
      repo.fetchProfiles(client, userIds),
      repo.fetchScores(client, evalIds),
    ]);

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.display_name ?? p.email);
    }

    evaluations = evalData.map((e) => ({
      ...e,
      target_name: nameMap.get(e.target_user_id) ?? e.target_user_id,
      evaluator_name: nameMap.get(e.evaluator_id) ?? e.evaluator_id,
      scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
    }));
  }

  const { data: cycleData } = await repo.fetchCyclesByTemplate(client, id, orgId);

  return {
    template: tplData,
    criteria: crData,
    evaluations,
    cycles: cycleData ?? [],
  };
}

export async function saveTemplateEdit(
  template: EvaluationTemplate,
  originalCriteria: EvaluationCriterion[],
  organizationId: string,
  editTitle: string,
  editTarget: string,
  editDescription: string,
  editCriteria: {
    id: string;
    label: string;
    description: string;
    score_type: string;
    options: string;
    sort_order: number;
    isNew?: boolean;
  }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();

    if (
      editTitle !== template.title ||
      editTarget !== template.target ||
      editDescription !== (template.description ?? "")
    ) {
      await repo.updateTemplate(client, template.id, organizationId, {
        title: editTitle,
        target: editTarget,
        description: editDescription || null,
      });
    }

    const existingIds = originalCriteria.map((c) => c.id);
    const editIds = editCriteria.filter((c) => !c.isNew).map((c) => c.id);

    const deletedIds = existingIds.filter((cid) => !editIds.includes(cid));
    if (deletedIds.length > 0) {
      await repo.deleteCriteria(client, deletedIds);
    }

    const newCriteria = editCriteria.filter((c) => c.isNew);
    if (newCriteria.length > 0) {
      // id は evaluation_criteria.id の DEFAULT gen_random_uuid() に任せる。
      // フロント採番は禁止（非 UUID 文字列を uuid カラムに投入するとキャストエラー）。
      await repo.insertCriteria(
        client,
        newCriteria.map((c) => ({
          template_id: template.id,
          label: c.label,
          description: c.description || null,
          score_type: c.score_type,
          options:
            c.options && c.score_type === "select" ? c.options.split("\n").filter(Boolean) : null,
          sort_order: c.sort_order,
        }))
      );
    }

    for (const ec of editCriteria.filter((c) => !c.isNew && existingIds.includes(c.id))) {
      const original = originalCriteria.find((c) => c.id === ec.id);
      if (!original) continue;
      const changed =
        ec.label !== original.label ||
        ec.score_type !== original.score_type ||
        ec.description !== (original.description ?? "") ||
        ec.options !== (original.options?.join("\n") ?? "");

      if (changed) {
        await repo.updateCriterion(client, ec.id, {
          label: ec.label,
          description: ec.description || null,
          score_type: ec.score_type,
          options:
            ec.options && ec.score_type === "select"
              ? ec.options.split("\n").filter(Boolean)
              : null,
          sort_order: ec.sort_order,
        });
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "評価シートの更新に失敗しました" };
  }
}

// ─── Cycle detail ───

export interface DepartmentWithMembers extends Department {
  members: Profile[];
}

export interface CycleDetailData {
  cycle: EvaluationCycle | null;
  criteria: EvaluationCriterion[];
  assignments: (EvaluationAssignment & { target_user?: Profile; evaluator?: Profile })[];
  allScores: EvaluationScore[];
  orgMembers: Profile[];
  departments: DepartmentWithMembers[];
}

export async function loadCycleDetail(id: string, orgId: string): Promise<CycleDetailData> {
  const client = getSupabase();

  const [{ data: cycleData }, { data: members }, { data: deptData }] = await Promise.all([
    repo.fetchCycleById(client, id, orgId),
    repo.fetchOrgMembers(client, orgId),
    repo.fetchDepartments(client, orgId),
  ]);

  const profiles = (members ?? [])
    .map((m) => (m as unknown as { profiles: Profile }).profiles)
    .filter(Boolean);

  let departments: DepartmentWithMembers[] = [];

  if (deptData && deptData.length > 0) {
    const { data: empDepts } = await repo.fetchEmployeeDepartments(
      client,
      deptData.map((d) => d.id)
    );

    const deptMembers = new Map<string, Profile[]>();
    for (const ed of empDepts ?? []) {
      const profile = profiles.find((p) => p.id === ed.user_id);
      if (profile) {
        if (!deptMembers.has(ed.department_id)) deptMembers.set(ed.department_id, []);
        deptMembers.get(ed.department_id)!.push(profile);
      }
    }

    departments = (deptData as Department[]).map((d) => ({
      ...d,
      members: deptMembers.get(d.id) ?? [],
    }));
  }

  let criteria: EvaluationCriterion[] = [];
  let assignments: (EvaluationAssignment & { target_user?: Profile; evaluator?: Profile })[] = [];
  let allScores: EvaluationScore[] = [];

  if (cycleData) {
    const [crData, { data: assignData }] = await Promise.all([
      repo.fetchCriteria(client, cycleData.template_id),
      repo.fetchAssignments(client, id),
    ]);

    criteria = crData;

    const assignmentList = assignData ?? [];
    const userIds = [...new Set(assignmentList.flatMap((a) => [a.target_user_id, a.evaluator_id]))];

    const profileMap = new Map<string, Profile>();
    if (userIds.length > 0) {
      const { data: profileData } = await repo.fetchProfilesWithRole(client, userIds);
      for (const p of profileData ?? []) profileMap.set(p.id, p as Profile);
    }

    assignments = assignmentList.map((a) => ({
      ...a,
      target_user: profileMap.get(a.target_user_id),
      evaluator: profileMap.get(a.evaluator_id),
    }));

    const submittedEvalIds = assignmentList
      .filter((a) => a.evaluation_id)
      .map((a) => a.evaluation_id!);
    if (submittedEvalIds.length > 0) {
      const { data: scoreData } = await repo.fetchScores(client, submittedEvalIds);
      allScores = scoreData ?? [];
    }
  }

  return {
    cycle: cycleData,
    criteria,
    assignments,
    allScores,
    orgMembers: profiles,
    departments,
  };
}

export async function bulkAddAssignments(
  cycleId: string,
  endDate: string,
  pairs: { targetId: string; evaluatorId: string; raterType: string }[]
): Promise<{ success: boolean; error?: string; count: number }> {
  try {
    const client = getSupabase();
    // id は evaluation_assignments.id の DEFAULT gen_random_uuid() に任せる。
    // フロント採番は禁止。
    const rows = pairs.map((p) => ({
      cycle_id: cycleId,
      target_user_id: p.targetId,
      evaluator_id: p.evaluatorId,
      rater_type: p.raterType,
      due_date: endDate,
    }));

    const { error } = await repo.insertAssignments(client, rows);
    if (error) throw error;

    return { success: true, count: pairs.length };
  } catch (err) {
    console.error("bulkAddAssignments failed", err);
    return { success: false, error: "追加に失敗しました", count: 0 };
  }
}

export async function removeAssignment(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteAssignment(getSupabase(), id);
  if (error) return { success: false, error: "削除に失敗しました" };
  return { success: true };
}

export async function removeAssignments(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.deleteAssignments(getSupabase(), ids);
  if (error) return { success: false, error: "削除に失敗しました" };
  return { success: true };
}

export async function updateCycleStatus(
  cycleId: string,
  organizationId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.updateCycle(getSupabase(), cycleId, organizationId, {
    status: newStatus,
    updated_at: new Date().toISOString(),
  });
  if (error) return { success: false, error: "ステータスの更新に失敗しました" };
  return { success: true };
}

// ─── Evaluation tab component helpers ───

export async function loadEvaluationTabData(
  orgId: string,
  targetUserId: string,
  targetType: string,
  applicationId?: string
) {
  const client = getSupabase();

  const templates = await repo.fetchTemplatesByTarget(client, orgId, [targetType, "both"]);

  const { data: evalData } = await repo.fetchEvaluationsByUser(
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
  })[] = [];

  if (evalData && evalData.length > 0) {
    const templateIds = [...new Set(evalData.map((e) => e.template_id))];
    const evalIds = evalData.map((e) => e.id);

    const [{ data: crData }, { data: scoreData }] = await Promise.all([
      repo.fetchCriteriaByTemplates(client, templateIds),
      repo.fetchScores(client, evalIds),
    ]);

    evaluations = evalData.map((e) => {
      const ev = e as Evaluation & {
        evaluation_templates?: { title: string };
        evaluator?: { display_name: string | null; email: string };
      };
      return {
        ...e,
        evaluator_name: ev.evaluator?.display_name ?? ev.evaluator?.email ?? e.evaluator_id,
        scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
        criteria: (crData ?? []).filter((c) => c.template_id === e.template_id),
        template_title:
          ev.evaluation_templates?.title ??
          templates.find((t) => t.id === e.template_id)?.title ??
          e.template_id,
      };
    });
  }

  return { templates, evaluations };
}

export async function loadTemplateCriteria(templateId: string) {
  const client = getSupabase();
  const cr = await repo.fetchCriteria(client, templateId);

  let anchors: Awaited<ReturnType<typeof repo.fetchAnchors>>["data"] = [];
  if (cr.length > 0) {
    const { data: anchorData } = await repo.fetchAnchors(
      client,
      cr.map((c) => c.id)
    );
    anchors = anchorData ?? [];
  }

  return { criteria: cr, anchors: anchors ?? [] };
}

/**
 * アドホック評価（応募者/社員詳細ページからの直接評価）を作成または更新する。
 * `submit_ad_hoc_evaluation` RPC により evaluations 本体とスコア行を
 * 1 トランザクションで処理する。id は全て DB 側で採番される。
 *
 * `userId` パラメータは過去互換のため受け取るが、RPC 側で `auth.uid()` を
 * 強制するため参照しない（なりすまし防止）。
 */
export async function submitEvaluation(
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
    await repo.rpcSubmitAdHocEvaluation(getSupabase(), {
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
    console.error("submitEvaluation failed", err);
    return { success: false, error: "評価の保存に失敗しました" };
  }
}
