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
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // New evaluation form
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formCriteria, setFormCriteria] = useState<EvaluationCriterion[]>([]);
  const [formAnchors, setFormAnchors] = useState<EvaluationAnchor[]>([]);
  const [scores, setScores] = useState<ScoreDraft[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const result = await loadEvaluationTabData(organization.id, targetUserId, targetType);
    setTemplates(result.templates);
    setEvaluations(result.evaluations);

    setLoading(false);
  }

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

  function updateScore(criterionId: string, field: string, value: string | number | null) {
    setScores(scores.map((s) => (s.criterion_id === criterionId ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(status: "draft" | "submitted") {
    if (!organization || !user || !selectedTemplateId) return;
    setSaving(true);

    const result = await submitEvaluation(organization.id, user.id, {
      templateId: selectedTemplateId,
      targetUserId,
      applicationId,
      status,
      overallComment,
      scores,
    });

    if (result.success) {
      showToast(status === "submitted" ? "評価を提出しました" : "下書きを保存しました");
      setShowForm(false);
      await loadData();
    } else {
      showToast(result.error ?? "評価の保存に失敗しました", "error");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">読み込み中...</p>;
  }

  // --- 新規評価フォーム ---
  if (showForm) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">新規評価</h3>
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
            キャンセル
          </Button>
        </div>

        <div className="space-y-2">
          <Label>評価シート *</Label>
          <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="評価シートを選択" />
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

        {formCriteria.length > 0 && (
          <>
            <div className="space-y-4">
              {formCriteria.map((c) => {
                const scoreDraft = scores.find((s) => s.criterion_id === c.id);
                return (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {c.label}
                        <Badge variant="outline" className="text-xs font-normal">
                          {scoreTypeLabels[c.score_type]}
                        </Badge>
                      </CardTitle>
                      {c.description && (
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {c.score_type === "five_star" &&
                        (() => {
                          const criterionAnchors = formAnchors.filter(
                            (a) => a.criterion_id === c.id
                          );
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
                                        scoreDraft &&
                                          scoreDraft.score !== null &&
                                          n <= scoreDraft.score
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
                          const criterionAnchors = formAnchors.filter(
                            (a) => a.criterion_id === c.id
                          );
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>総合コメント</Label>
              <Textarea
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder="全体を通しての所感"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={saving}>
                下書き保存
              </Button>
              <Button onClick={() => handleSubmit("submitted")} disabled={saving}>
                {saving ? "保存中..." : "評価を提出"}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- 評価一覧表示 ---
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end">
        {templates.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            評価を追加
          </Button>
        )}
      </div>

      {evaluations.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {templates.length === 0 ? "評価シートを先に作成してください" : "まだ評価がありません"}
        </p>
      ) : (
        <div className="space-y-4">
          {evaluations.map((ev) => (
            <Card key={ev.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{ev.template_title}</CardTitle>
                  <Badge variant={evaluationStatusColors[ev.status]}>
                    {evaluationStatusLabels[ev.status]}
                  </Badge>
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
