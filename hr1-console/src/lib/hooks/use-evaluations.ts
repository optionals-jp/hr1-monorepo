"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/evaluation-repository";
import type { EvaluationTemplate, EvaluationCycle } from "@/types/database";

export function useEvaluationTemplates() {
  return useOrgQuery<EvaluationTemplate[]>("eval-templates", (orgId) =>
    repo.fetchTemplates(getSupabase(), orgId)
  );
}

export function useEvaluationCyclesWithDetails() {
  return useOrgQuery<
    (EvaluationCycle & {
      template_title: string;
      assignment_count: number;
      submitted_count: number;
    })[]
  >("eval-cycles", async (orgId) => {
    const client = getSupabase();
    const cycleData = await repo.fetchCycles(client, orgId);

    if (cycleData.length === 0) return [];

    const templateIds = [...new Set(cycleData.map((c) => c.template_id))];
    const cycleIds = cycleData.map((c) => c.id);

    const [{ data: tplData }, { data: assignments }] = await Promise.all([
      repo.fetchTemplateTitles(client, templateIds),
      repo.fetchAssignmentsByCycles(client, cycleIds),
    ]);

    const titleMap = new Map<string, string>();
    for (const t of tplData ?? []) titleMap.set(t.id, t.title);

    return cycleData.map((c) => {
      const cycleAssignments = (assignments ?? []).filter((a) => a.cycle_id === c.id);
      return {
        ...c,
        template_title: titleMap.get(c.template_id) ?? "",
        assignment_count: cycleAssignments.length,
        submitted_count: cycleAssignments.filter((a) => a.status === "submitted").length,
      };
    });
  });
}

export function useMultiRaterTemplates() {
  return useOrgQuery<EvaluationTemplate[]>("eval-templates-multi", (orgId) =>
    repo.fetchMultiRaterTemplates(getSupabase(), orgId)
  );
}

export async function createTemplate(
  orgId: string,
  data: {
    title: string;
    target: string;
    evaluationType: string;
    anonymityMode: string;
    description: string;
    criteria: {
      label: string;
      description: string;
      score_type: string;
      options: string;
      weight: string;
      anchors: { score_value: number; description: string }[];
    }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const templateId = `evaltpl-${Date.now()}`;

    const { error: tplError } = await repo.insertTemplate(client, {
      id: templateId,
      organization_id: orgId,
      title: data.title,
      target: data.target,
      evaluation_type: data.evaluationType,
      anonymity_mode: data.evaluationType === "multi_rater" ? data.anonymityMode : "none",
      description: data.description || null,
    });
    if (tplError) throw tplError;

    if (data.criteria.length > 0) {
      const criteriaRows = data.criteria.map((c, index) => ({
        id: `evalcr-${templateId}-${index + 1}`,
        template_id: templateId,
        label: c.label,
        description: c.description || null,
        score_type: c.score_type,
        options:
          c.options && c.score_type === "select" ? c.options.split("\n").filter(Boolean) : null,
        sort_order: index + 1,
        weight: parseFloat(c.weight) || 1.0,
      }));

      const { error: crError } = await repo.insertCriteria(client, criteriaRows);
      if (crError) throw crError;

      const anchorRows = data.criteria.flatMap((c, cIndex) =>
        c.anchors
          .filter((a) => a.description.trim())
          .map((a, aIndex) => ({
            id: `anchor-${criteriaRows[cIndex].id}-${a.score_value}`,
            criterion_id: criteriaRows[cIndex].id,
            score_value: a.score_value,
            description: a.description,
            sort_order: aIndex,
          }))
      );

      if (anchorRows.length > 0) {
        const { error: anchorError } = await repo.insertAnchors(client, anchorRows);
        if (anchorError) throw anchorError;
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "評価シートの作成に失敗しました" };
  }
}

export async function createCycle(
  orgId: string,
  userId: string,
  data: {
    title: string;
    description: string;
    templateId: string;
    startDate: string;
    endDate: string;
  }
): Promise<{ success: boolean; error?: string; cycleId?: string }> {
  try {
    const client = getSupabase();
    const cycleId = `cycle-${Date.now()}`;

    const { error } = await repo.insertCycle(client, {
      id: cycleId,
      organization_id: orgId,
      title: data.title,
      description: data.description || null,
      template_id: data.templateId,
      start_date: data.startDate,
      end_date: data.endDate,
      created_by: userId,
    });
    if (error) throw error;

    return { success: true, cycleId };
  } catch {
    return { success: false, error: "サイクルの作成に失敗しました" };
  }
}
