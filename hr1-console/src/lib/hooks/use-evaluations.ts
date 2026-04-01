"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/evaluation-repository";
import type { EvaluationTemplate, EvaluationCycle } from "@/types/database";

interface AnchorDraft {
  score_value: number;
  description: string;
}

interface CriterionDraft {
  tempId: string;
  label: string;
  description: string;
  score_type: string;
  options: string;
  weight: string;
  anchors: AnchorDraft[];
  showAnchors: boolean;
}

function getDefaultAnchors(scoreType: string): AnchorDraft[] {
  const max = scoreType === "five_star" ? 5 : scoreType === "ten_point" ? 10 : 0;
  return Array.from({ length: max }, (_, i) => ({
    score_value: i + 1,
    description: "",
  }));
}

export type { AnchorDraft, CriterionDraft };

export function useCreateEvaluation() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { organization } = useOrg();

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("both");
  const [evaluationType, setEvaluationType] = useState<string>("single");
  const [anonymityMode, setAnonymityMode] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const addCriterion = useCallback(() => {
    setCriteria((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}`,
        label: "",
        description: "",
        score_type: "five_star",
        options: "",
        weight: "1.00",
        anchors: getDefaultAnchors("five_star"),
        showAnchors: false,
      },
    ]);
  }, []);

  const removeCriterion = useCallback((tempId: string) => {
    setCriteria((prev) => prev.filter((c) => c.tempId !== tempId));
  }, []);

  const updateCriterion = useCallback((tempId: string, field: string, value: string | boolean) => {
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.tempId !== tempId) return c;
        const updated = { ...c, [field]: value };
        if (field === "score_type" && typeof value === "string") {
          updated.anchors = getDefaultAnchors(value);
        }
        return updated;
      })
    );
  }, []);

  const updateAnchor = useCallback(
    (tempId: string, scoreValue: number, anchorDescription: string) => {
      setCriteria((prev) =>
        prev.map((c) => {
          if (c.tempId !== tempId) return c;
          return {
            ...c,
            anchors: c.anchors.map((a) =>
              a.score_value === scoreValue ? { ...a, description: anchorDescription } : a
            ),
          };
        })
      );
    },
    []
  );

  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !title) return { success: false };
    setSaving(true);

    const result = await createTemplate(organization.id, {
      title,
      target,
      evaluationType,
      anonymityMode,
      description,
      criteria: criteria.map((c) => ({
        label: c.label,
        description: c.description,
        score_type: c.score_type,
        options: c.options,
        weight: c.weight,
        anchors: c.anchors,
      })),
    });

    if (result.success) {
      await mutate(`eval-templates-${organization.id}`);
      router.push("/evaluations");
      setSaving(false);
      return { success: true };
    } else {
      setSaving(false);
      return { success: false, error: result.error ?? "評価シートの作成に失敗しました" };
    }
  }, [
    organization,
    title,
    target,
    evaluationType,
    anonymityMode,
    description,
    criteria,
    mutate,
    router,
  ]);

  const cancel = useCallback(() => {
    router.push("/evaluations");
  }, [router]);

  return {
    title,
    setTitle,
    target,
    setTarget,
    evaluationType,
    setEvaluationType,
    anonymityMode,
    setAnonymityMode,
    description,
    setDescription,
    criteria,
    saving,
    addCriterion,
    removeCriterion,
    updateCriterion,
    updateAnchor,
    handleSubmit,
    cancel,
  };
}

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

export function useNewEvaluationCycle() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { organization } = useOrg();
  const { user } = useAuth();

  const {
    data: templates,
    error: templatesError,
    mutate: mutateTemplates,
  } = useMultiRaterTemplates();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !user || !title || !templateId || !startDate || !endDate)
      return { success: false };
    setSaving(true);

    const result = await createCycle(organization.id, user.id, {
      title,
      description,
      templateId,
      startDate,
      endDate,
    });

    if (result.success) {
      await mutate(`eval-cycles-${organization.id}`);
      router.push(`/evaluations/cycles/${result.cycleId}`);
      setSaving(false);
      return { success: true };
    } else {
      setSaving(false);
      return { success: false, error: result.error ?? "サイクルの作成に失敗しました" };
    }
  };

  const cancel = () => {
    router.push("/evaluations/cycles");
  };

  return {
    templates,
    templatesError,
    mutateTemplates,
    title,
    setTitle,
    description,
    setDescription,
    templateId,
    setTemplateId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    saving,
    handleSubmit,
    cancel,
  };
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
