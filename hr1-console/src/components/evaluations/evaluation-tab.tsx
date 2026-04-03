"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import {
  loadEvaluationTabData,
  loadTemplateCriteria,
  submitEvaluation,
} from "@/lib/hooks/use-evaluation-detail";
import {
  scoreTypeLabels,
  evaluationStatusLabels,
  evaluationStatusColors,
  raterTypeLabels,
} from "@/lib/constants";
import type {
  EvaluationTemplate,
  EvaluationCriterion,
  EvaluationAnchor,
  Evaluation,
  EvaluationScore,
} from "@/types/database";
import { Star, Plus, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

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

interface ScoreDraft {
  criterion_id: string;
  score: number | null;
  value: string;
  comment: string;
}

export function EvaluationTab({ targetUserId, targetType, applicationId }: EvaluationTabProps) {
  const { user } = useAuth();
  const { organization } = useOrg();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [evaluations, setEvaluations] = useState<EvalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Evaluation form (new or edit)
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

    const result = await submitEvaluation(organization.id, user.id, {
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

  // --- 評価一覧表示 ---
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        {templates.length > 0 && (
          <Button onClick={() => setTemplateDialogOpen(true)}>
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
          ? "評価を追加して、この応募者のスキルや適性を記録しましょう。複数の評価者による多面的な評価が可能です。"
          : "評価を行うには、まず評価シートを作成してください。設定 → 評価シート管理から作成できます。"}
      </p>
      {hasTemplates && (
        <Button onClick={onAdd}>
          <Plus className="size-4 mr-1.5" />
          評価を追加
        </Button>
      )}
    </div>
  );
}

function TemplateSelectDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EvaluationTemplate[];
  onSelect: (templateId: string) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[80vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              評価シートを選択
            </DialogPrimitive.Title>
            <p className="text-sm text-muted-foreground mt-1">使用する評価シートを選んでください</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="w-full text-left rounded-xl border p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {t.target === "applicant"
                        ? "応募者向け"
                        : t.target === "employee"
                          ? "社員向け"
                          : "共通"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t.evaluation_type === "multi_rater" ? "多面評価" : "単独評価"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function EvaluationFormDialog({
  open,
  onOpenChange,
  title,
  templates,
  selectedTemplateId,
  onTemplateChange,
  formCriteria,
  formAnchors,
  scores,
  updateScore,
  overallComment,
  setOverallComment,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  templates: EvaluationTemplate[];
  selectedTemplateId: string;
  onTemplateChange?: (templateId: string | null) => void;
  formCriteria: EvaluationCriterion[];
  formAnchors: EvaluationAnchor[];
  scores: ScoreDraft[];
  updateScore: (criterionId: string, field: string, value: string | number | null) => void;
  overallComment: string;
  setOverallComment: (v: string) => void;
  saving: boolean;
  onSubmit: (status: "draft" | "submitted") => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[85vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {onTemplateChange && (
              <div className="space-y-2">
                <Label>評価シート *</Label>
                <Select value={selectedTemplateId} onValueChange={onTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="評価シートを選択">
                      {(v: string) => templates.find((t) => t.id === v)?.title ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formCriteria.map((c) => {
              const scoreDraft = scores.find((s) => s.criterion_id === c.id);
              return (
                <div key={c.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {scoreTypeLabels[c.score_type]}
                    </Badge>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  )}

                  {c.score_type === "five_star" &&
                    (() => {
                      const criterionAnchors = formAnchors.filter((a) => a.criterion_id === c.id);
                      const selectedAnchor = criterionAnchors.find(
                        (a) => a.score_value === scoreDraft?.score
                      );
                      return (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => updateScore(c.id, "score", n)}
                                className="p-0.5"
                                title={
                                  criterionAnchors.find((a) => a.score_value === n)?.description
                                }
                              >
                                <Star
                                  className={cn(
                                    "h-6 w-6 transition-colors",
                                    scoreDraft && scoreDraft.score !== null && n <= scoreDraft.score
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300"
                                  )}
                                />
                              </button>
                            ))}
                            {scoreDraft?.score && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                {scoreDraft.score}/5
                              </span>
                            )}
                          </div>
                          {selectedAnchor && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                              {selectedAnchor.description}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  {c.score_type === "ten_point" &&
                    (() => {
                      const criterionAnchors = formAnchors.filter((a) => a.criterion_id === c.id);
                      const selectedAnchor = criterionAnchors.find(
                        (a) => a.score_value === scoreDraft?.score
                      );
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={scoreDraft?.score ?? ""}
                              onChange={(e) =>
                                updateScore(
                                  c.id,
                                  "score",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">/ 10</span>
                          </div>
                          {selectedAnchor && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                              {selectedAnchor.description}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  {c.score_type === "text" && (
                    <Textarea
                      value={scoreDraft?.value ?? ""}
                      onChange={(e) => updateScore(c.id, "value", e.target.value)}
                      placeholder="自由記述"
                      rows={3}
                    />
                  )}

                  {c.score_type === "select" && c.options && (
                    <Select
                      value={scoreDraft?.value ?? ""}
                      onValueChange={(v) => updateScore(c.id, "value", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {c.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">コメント</Label>
                    <Input
                      value={scoreDraft?.comment ?? ""}
                      onChange={(e) => updateScore(c.id, "comment", e.target.value)}
                      placeholder="補足コメント"
                    />
                  </div>
                </div>
              );
            })}

            {formCriteria.length > 0 && (
              <div className="space-y-2">
                <Label>総合コメント</Label>
                <Textarea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  placeholder="全体を通しての所感"
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t flex items-center justify-between shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onSubmit("draft")} disabled={saving}>
                下書き保存
              </Button>
              <Button onClick={() => onSubmit("submitted")} disabled={saving}>
                {saving ? "保存中..." : "評価を提出"}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
