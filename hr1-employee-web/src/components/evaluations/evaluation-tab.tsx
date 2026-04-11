"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import {
  loadEvaluationTabData,
  loadTemplateCriteria,
  submitAdHocEvaluation,
} from "@/lib/hooks/use-evaluations";
import {
  evaluationStatusLabels,
  evaluationStatusColors,
  raterTypeLabels,
  scoreTypeLabels,
} from "@/lib/constants";
import type {
  EvaluationTemplate,
  EvaluationCriterion,
  EvaluationAnchor,
  Evaluation,
  EvaluationScore,
} from "@/types/database";
import { Star, Plus, ClipboardCheck } from "lucide-react";
import { TemplateSelectDialog, EvaluationFormDialog, type ScoreDraft } from "@hr1/shared-ui";

interface EvaluationTabProps {
  targetUserId: string;
  targetType: "applicant" | "employee";
  applicationId?: string;
}

interface EvalWithDetails extends Evaluation {
  evaluator_name: string;
  scores: EvaluationScore[];
  criteria: EvaluationCriterion[];
  template_title: string;
}

export function EvaluationTab({ targetUserId, targetType, applicationId }: EvaluationTabProps) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [evaluations, setEvaluations] = useState<EvalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formCriteria, setFormCriteria] = useState<EvaluationCriterion[]>([]);
  const [formAnchors, setFormAnchors] = useState<EvaluationAnchor[]>([]);
  const [scores, setScores] = useState<ScoreDraft[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  useEffect(() => {
    if (!organization) return;
    let cancelled = false;

    loadEvaluationTabData(organization.id, targetUserId, targetType, applicationId).then(
      (result) => {
        if (cancelled) return;
        setTemplates(result.templates);
        setEvaluations(result.evaluations);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [organization, targetUserId, targetType, applicationId]);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    const result = await loadEvaluationTabData(
      organization.id,
      targetUserId,
      targetType,
      applicationId
    );
    setTemplates(result.templates);
    setEvaluations(result.evaluations);
    setLoading(false);
  };

  async function handleTemplateSelect(templateId: string | null) {
    if (!templateId) return;
    setSelectedTemplateId(templateId);
    const result = await loadTemplateCriteria(templateId);

    setFormCriteria(result.criteria);
    setFormAnchors(result.anchors);

    setScores(
      result.criteria.map((c) => ({
        criterion_id: c.id,
        score: null,
        value: "",
        comment: "",
      }))
    );
    setOverallComment("");
  }

  async function handleEdit(ev: EvalWithDetails) {
    setEditingEvaluationId(ev.id);
    setSelectedTemplateId(ev.template_id);
    const result = await loadTemplateCriteria(ev.template_id);
    setFormCriteria(result.criteria);
    setFormAnchors(result.anchors);
    setScores(
      result.criteria.map((c) => {
        const existing = ev.scores.find((s) => s.criterion_id === c.id);
        return {
          criterion_id: c.id,
          score: existing?.score ?? null,
          value: existing?.value ?? "",
          comment: existing?.comment ?? "",
        };
      })
    );
    setOverallComment(ev.overall_comment ?? "");
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingEvaluationId(null);
  }

  function updateScore(criterionId: string, field: string, value: string | number | null) {
    setScores(scores.map((s) => (s.criterion_id === criterionId ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(status: "draft" | "submitted") {
    if (!organization || !user || !selectedTemplateId) return;
    setSaving(true);

    const result = await submitAdHocEvaluation(organization.id, user.id, {
      evaluationId: editingEvaluationId ?? undefined,
      templateId: selectedTemplateId,
      targetUserId,
      applicationId,
      status,
      overallComment,
      scores,
    });

    if (result.success) {
      showToast(
        editingEvaluationId
          ? "評価を更新しました"
          : status === "submitted"
            ? "評価を提出しました"
            : "下書きを保存しました"
      );
      setShowForm(false);
      setEditingEvaluationId(null);
      await loadData();
    } else {
      showToast(result.error ?? "評価の保存に失敗しました", "error");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">読み込み中...</p>;
  }

  const handleSelectTemplate = (templateId: string) => {
    setTemplateDialogOpen(false);
    setEditingEvaluationId(null);
    handleTemplateSelect(templateId);
    setShowForm(true);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        {templates.length > 0 && (
          <Button variant="primary" onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            評価を追加
          </Button>
        )}
      </div>

      <TemplateSelectDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        onSelect={handleSelectTemplate}
        targetLabels={{ applicant: "候補者向け", employee: "社員向け", both: "共通" }}
      />

      <EvaluationFormDialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) handleCancelForm();
        }}
        title={editingEvaluationId ? "評価を編集" : "新規評価"}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={editingEvaluationId ? undefined : handleTemplateSelect}
        formCriteria={formCriteria}
        formAnchors={formAnchors}
        scores={scores}
        updateScore={updateScore}
        overallComment={overallComment}
        setOverallComment={setOverallComment}
        saving={saving}
        onSubmit={handleSubmit}
        scoreTypeLabels={scoreTypeLabels}
      />

      {evaluations.length === 0 ? (
        <EvaluationEmptyState
          hasTemplates={templates.length > 0}
          onAdd={() => setTemplateDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {evaluations.map((ev) => (
            <Card key={ev.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{ev.template_title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {user?.id === ev.evaluator_id && (
                      <Button variant="ghost" size="xs" onClick={() => handleEdit(ev)}>
                        編集
                      </Button>
                    )}
                    <Badge variant={evaluationStatusColors[ev.status]}>
                      {evaluationStatusLabels[ev.status]}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  評価者: {ev.evaluator_name}
                  {ev.rater_type && (
                    <span className="ml-1">
                      ({raterTypeLabels[ev.rater_type] ?? ev.rater_type})
                    </span>
                  )}{" "}
                  ・ {format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {ev.criteria.map((c) => {
                  const score = ev.scores.find((s) => s.criterion_id === c.id);
                  return (
                    <div key={c.id} className="flex items-start gap-3 text-sm">
                      <span className="font-medium min-w-[120px] shrink-0">{c.label}</span>
                      <div className="flex-1">
                        {(c.score_type === "five_star" || c.score_type === "ten_point") &&
                          score?.score != null && (
                            <div className="flex items-center gap-1">
                              {c.score_type === "five_star" ? (
                                <>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                      key={n}
                                      className={cn(
                                        "h-4 w-4",
                                        n <= score.score!
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-200"
                                      )}
                                    />
                                  ))}
                                </>
                              ) : (
                                <span>{score.score}/10</span>
                              )}
                            </div>
                          )}
                        {(c.score_type === "text" || c.score_type === "select") && score?.value && (
                          <span>{score.value}</span>
                        )}
                        {score?.comment && (
                          <p className="text-xs text-muted-foreground mt-0.5">{score.comment}</p>
                        )}
                        {!score && <span className="text-muted-foreground">-</span>}
                      </div>
                    </div>
                  );
                })}
                {ev.overall_comment && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">総合コメント</p>
                    <p className="text-sm">{ev.overall_comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationEmptyState({
  hasTemplates,
  onAdd,
}: {
  hasTemplates: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-24 mb-6 rounded-full bg-muted/50 flex items-center justify-center">
        <ClipboardCheck className="size-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-2">まだ評価がありません</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {hasTemplates
          ? "評価を追加して、この候補者のスキルや適性を記録しましょう。複数の評価者による多面的な評価が可能です。"
          : "評価を行うには、まず評価シートを作成してください。設定 → 評価シート管理から作成できます。"}
      </p>
      {hasTemplates && (
        <Button variant="primary" onClick={onAdd}>
          <Plus className="size-4 mr-1.5" />
          評価を追加
        </Button>
      )}
    </div>
  );
}
