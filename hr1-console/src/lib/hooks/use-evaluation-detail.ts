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
      await repo.updateTemplate(client, template.id, {
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
      await repo.insertCriteria(
        client,
        newCriteria.map((c, i) => ({
          id: `evalcr-${template.id}-${Date.now()}-${i}`,
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
    const rows = pairs.map((p, i) => ({
      id: `assign-${Date.now()}-${i}`,
      cycle_id: cycleId,
      target_user_id: p.targetId,
      evaluator_id: p.evaluatorId,
      rater_type: p.raterType,
      due_date: endDate,
    }));

    const { error } = await repo.insertAssignments(client, rows);
    if (error) throw error;

    return { success: true, count: pairs.length };
  } catch {
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
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await repo.updateCycle(getSupabase(), cycleId, {
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
  targetType: string
) {
  const client = getSupabase();

  const templates = await repo.fetchTemplatesByTarget(client, orgId, [targetType, "both"]);

  const { data: evalData } = await repo.fetchEvaluationsByUser(client, orgId, targetUserId);

  let evaluations: (Evaluation & {
    evaluator_name: string;
    scores: EvaluationScore[];
    criteria: EvaluationCriterion[];
    template_title: string;
  })[] = [];

  if (evalData && evalData.length > 0) {
    const templateIds = [...new Set(evalData.map((e) => e.template_id))];
    const evalIds = evalData.map((e) => e.id);
    const evaluatorIds = [...new Set(evalData.map((e) => e.evaluator_id))];

    const [{ data: crData }, { data: scoreData }, { data: profiles }, { data: tpls }] =
      await Promise.all([
        repo.fetchCriteriaByTemplates(client, templateIds),
        repo.fetchScores(client, evalIds),
        repo.fetchProfiles(client, evaluatorIds),
        repo.fetchTemplateTitles(client, templateIds),
      ]);

    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.display_name ?? p.email);
    }

    const titleMap = new Map<string, string>();
    for (const t of tpls ?? []) {
      titleMap.set(t.id, t.title);
    }

    evaluations = evalData.map((e) => ({
      ...e,
      evaluator_name: nameMap.get(e.evaluator_id) ?? e.evaluator_id,
      scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
      criteria: (crData ?? []).filter((c) => c.template_id === e.template_id),
      template_title: titleMap.get(e.template_id) ?? "",
    }));
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

export async function submitEvaluation(
  orgId: string,
  userId: string,
  data: {
    templateId: string;
    targetUserId: string;
    applicationId?: string;
    status: "draft" | "submitted";
    overallComment: string;
    scores: { criterion_id: string; score: number | null; value: string; comment: string }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const evalId = `eval-${Date.now()}`;

    const { error: evalError } = await repo.insertEvaluation(client, {
      id: evalId,
      organization_id: orgId,
      template_id: data.templateId,
      target_user_id: data.targetUserId,
      evaluator_id: userId,
      application_id: data.applicationId ?? null,
      status: data.status,
      overall_comment: data.overallComment || null,
      submitted_at: data.status === "submitted" ? new Date().toISOString() : null,
    });
    if (evalError) throw evalError;

    const scoreRows = data.scores
      .filter((s) => s.score !== null || s.value || s.comment)
      .map((s, i) => ({
        id: `evalscore-${evalId}-${i}`,
        evaluation_id: evalId,
        criterion_id: s.criterion_id,
        score: s.score,
        value: s.value || null,
        comment: s.comment || null,
      }));

    if (scoreRows.length > 0) {
      const { error: scoreError } = await repo.insertScores(client, scoreRows);
      if (scoreError) throw scoreError;
    }

    return { success: true };
  } catch {
    return { success: false, error: "評価の保存に失敗しました" };
  }
}
