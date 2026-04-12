"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTabParam } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import {
  loadTemplateDetail,
  saveTemplateEdit,
  type EvalWithScores,
} from "@/lib/hooks/use-evaluation-detail";
import type { EvaluationTemplate, EvaluationCriterion, EvaluationCycle } from "@/types/database";

interface CriterionDraft {
  id: string;
  label: string;
  description: string;
  score_type: string;
  options: string;
  sort_order: number;
  isNew?: boolean;
}

export function useEvaluationTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [evaluations, setEvaluations] = useState<EvalWithScores[]>([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("criteria");

  // Search & filter states for evaluations tab
  const [evalSearch, setEvalSearch] = useState("");
  const [evalStatusFilter, setEvalStatusFilter] = useState<string>("all");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState<string>("both");
  const [editDescription, setEditDescription] = useState("");
  const [editCriteria, setEditCriteria] = useState<CriterionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const result = await loadTemplateDetail(id, organization.id);
    setTemplate(result.template);
    setCriteria(result.criteria);
    setEvaluations(result.evaluations);
    setCycles(result.cycles);

    setLoading(false);
  }

  function startEditing() {
    if (!template) return;
    setEditTitle(template.title);
    setEditTarget(template.target ?? "both");
    setEditDescription(template.description ?? "");
    setEditCriteria(
      criteria.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description ?? "",
        score_type: c.score_type,
        options: c.options?.join("\n") ?? "",
        sort_order: c.sort_order,
      }))
    );
    setEditTab("basic");
    setEditing(true);
  }

  function addCriterion() {
    const maxOrder =
      editCriteria.length > 0 ? Math.max(...editCriteria.map((c) => c.sort_order)) : 0;
    setEditCriteria([
      ...editCriteria,
      {
        id: `new-${Date.now()}`,
        label: "",
        description: "",
        score_type: "five_star",
        options: "",
        sort_order: maxOrder + 1,
        isNew: true,
      },
    ]);
  }

  function removeCriterion(criterionId: string) {
    setEditCriteria(editCriteria.filter((c) => c.id !== criterionId));
  }

  function updateCriterion(criterionId: string, key: string, value: string) {
    setEditCriteria(editCriteria.map((c) => (c.id === criterionId ? { ...c, [key]: value } : c)));
  }

  async function handleSave() {
    if (!template) return;
    setSaving(true);

    await saveTemplateEdit(
      template,
      criteria,
      organization!.id,
      editTitle,
      editTarget,
      editDescription,
      editCriteria
    );

    setSaving(false);
    setEditing(false);
    await loadData();
  }

  return {
    id,
    router,
    organization,
    template,
    criteria,
    evaluations,
    cycles,
    loading,
    activeTab,
    setActiveTab,
    evalSearch,
    setEvalSearch,
    evalStatusFilter,
    setEvalStatusFilter,
    editing,
    setEditing,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editTarget,
    setEditTarget,
    editDescription,
    setEditDescription,
    editCriteria,
    saving,
    startEditing,
    addCriterion,
    removeCriterion,
    updateCriterion,
    handleSave,
  };
}
