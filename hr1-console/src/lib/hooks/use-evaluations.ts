"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import {
  type EvaluationAnchorDraft as AnchorDraft,
  type EvaluationCriterionDraft as CriterionDraft,
  criteriaDraftsToRpcPayload,
  createCriterionDraft,
  getDefaultAnchors,
} from "@hr1/shared-ui/lib/evaluation-draft";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/evaluation-repository";
import type { EvaluationTemplate, EvaluationCycle } from "@/types/database";

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
    setCriteria((prev) => [...prev, createCriterionDraft()]);
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
      criteria,
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

/**
 * 評価テンプレートを作成する。
 * `create_evaluation_template` RPC を呼び出し、template / criteria / anchors を
 * 1 トランザクションで作成する。id は DB 側で採番される。
 */
export async function createTemplate(
  orgId: string,
  data: {
    title: string;
    target: string;
    evaluationType: string;
    anonymityMode: string;
    description: string;
    criteria: CriterionDraft[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await repo.rpcCreateEvaluationTemplate(getSupabase(), {
      organizationId: orgId,
      title: data.title,
      description: data.description,
      target: data.target,
      evaluationType: data.evaluationType,
      anonymityMode: data.anonymityMode,
      criteria: criteriaDraftsToRpcPayload(data.criteria),
    });
    return { success: true };
  } catch (err) {
    console.error("createTemplate failed", err);
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

    // id は evaluation_cycles.id の DEFAULT gen_random_uuid() に任せて
    // RETURNING で取得する。フロント採番は禁止。
    const { data: inserted, error } = await client
      .from("evaluation_cycles")
      .insert({
        organization_id: orgId,
        title: data.title,
        description: data.description || null,
        template_id: data.templateId,
        start_date: data.startDate,
        end_date: data.endDate,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    return { success: true, cycleId: (inserted as { id: string }).id };
  } catch (err) {
    console.error("createCycle failed", err);
    return { success: false, error: "サイクルの作成に失敗しました" };
  }
}
