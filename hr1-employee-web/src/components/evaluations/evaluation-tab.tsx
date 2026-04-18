"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
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
import {
  Star,
  Plus,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Briefcase,
  Zap,
} from "lucide-react";
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
  cycle_title: string | null;
  job_title: string | null;
}

function normalizeScore(score: number, scoreType: string): number | null {
  if (scoreType === "five_star") return score;
  if (scoreType === "ten_point") return score / 2;
  return null;
}

function scoreColorClass(score: number): string {
  if (score >= 4) return "bg-emerald-500";
  if (score >= 3) return "bg-amber-500";
  return "bg-rose-500";
}

function scoreTextColorClass(score: number): string {
  if (score >= 4) return "text-emerald-600";
  if (score >= 3) return "text-amber-600";
  return "text-rose-600";
}

export function EvaluationTab({ targetUserId, targetType, applicationId }: EvaluationTabProps) {
  const router = useRouter();
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

  const submittedEvaluations = useMemo(
    () => evaluations.filter((ev) => ev.status === "submitted"),
    [evaluations]
  );

  const summary = useMemo(() => {
    const statusCount = { submitted: 0, draft: 0 };
    const raterCount: Record<string, number> = {};
    const numericValues: number[] = [];
    // criterion_id -> { label, values[], scoreType }
    const criterionMap = new Map<string, { label: string; scoreType: string; values: number[] }>();

    for (const ev of evaluations) {
      if (ev.status === "submitted") statusCount.submitted += 1;
      else statusCount.draft += 1;
      if (ev.rater_type) raterCount[ev.rater_type] = (raterCount[ev.rater_type] ?? 0) + 1;

      if (ev.status !== "submitted") continue;

      for (const c of ev.criteria) {
        if (c.score_type !== "five_star" && c.score_type !== "ten_point") continue;
        const scoreObj = ev.scores.find((s) => s.criterion_id === c.id);
        if (scoreObj?.score == null) continue;
        const normalized = normalizeScore(scoreObj.score, c.score_type);
        if (normalized == null) continue;

        numericValues.push(normalized);

        const entry = criterionMap.get(c.id) ?? {
          label: c.label,
          scoreType: c.score_type,
          values: [],
        };
        entry.values.push(normalized);
        criterionMap.set(c.id, entry);
      }
    }

    const overallAvg =
      numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        : null;

    const criterionAverages = Array.from(criterionMap.entries())
      .map(([id, v]) => ({
        id,
        label: v.label,
        scoreType: v.scoreType,
        avg: v.values.reduce((a, b) => a + b, 0) / v.values.length,
        count: v.values.length,
      }))
      .sort((a, b) => b.avg - a.avg);

    return { statusCount, raterCount, overallAvg, criterionAverages };
  }, [evaluations]);

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

  const topCriterion = summary.criterionAverages[0];
  const bottomCriterion =
    summary.criterionAverages.length > 1
      ? summary.criterionAverages[summary.criterionAverages.length - 1]
      : null;

  return (
    <div className="max-w-4xl space-y-4">
      <TemplateSelectDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        onSelect={handleSelectTemplate}
        targetLabels={{ applicant: "候補者向け", employee: "社員向け", both: "共通" }}
        onAdd={() => {
          setTemplateDialogOpen(false);
          router.push("/evaluation-templates?new=1");
        }}
        addLabel="評価シートを作成"
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
        <>
          {/* サマリーカード: 総合評価・評価数・評価者内訳 */}
          <SectionCard>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">評価サマリー</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  提出済み評価 {summary.statusCount.submitted} 件の集計
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setTemplateDialogOpen(true)}>
                <Plus className="size-4 mr-1" />
                評価を追加
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 総合スコア */}
              <div className="rounded-xl bg-background/70 p-4 ring-1 ring-foreground/5">
                <p className="text-xs text-muted-foreground mb-1">総合スコア</p>
                {summary.overallAvg != null ? (
                  <div className="flex items-end gap-2">
                    <span
                      className={cn(
                        "text-3xl font-bold leading-none",
                        scoreTextColorClass(summary.overallAvg)
                      )}
                    >
                      {summary.overallAvg.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-0.5">/ 5.0</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {summary.overallAvg != null && (
                  <div className="flex items-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "h-4 w-4",
                          n <= Math.round(summary.overallAvg!)
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 評価件数 */}
              <div className="rounded-xl bg-background/70 p-4 ring-1 ring-foreground/5">
                <p className="text-xs text-muted-foreground mb-1">評価件数</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold leading-none">
                    {summary.statusCount.submitted}
                  </span>
                  <span className="text-sm text-muted-foreground mb-0.5">件 提出済み</span>
                </div>
                {summary.statusCount.draft > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    下書き {summary.statusCount.draft} 件
                  </p>
                )}
              </div>

              {/* 評価者内訳 */}
              <div className="rounded-xl bg-background/70 p-4 ring-1 ring-foreground/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="size-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">評価者内訳</p>
                </div>
                {Object.keys(summary.raterCount).length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">—</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(summary.raterCount).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="font-normal">
                        {raterTypeLabels[type] ?? type} {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 強み・弱み */}
            {(topCriterion || bottomCriterion) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {topCriterion && (
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                    <TrendingUp className="size-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-emerald-700 font-medium">強み</p>
                      <p className="text-sm font-medium truncate">{topCriterion.label}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 shrink-0">
                      {topCriterion.avg.toFixed(1)}
                    </span>
                  </div>
                )}
                {bottomCriterion && bottomCriterion.id !== topCriterion?.id && (
                  <div className="flex items-center gap-3 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-rose-100">
                    <TrendingDown className="size-4 text-rose-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-rose-700 font-medium">課題</p>
                      <p className="text-sm font-medium truncate">{bottomCriterion.label}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-700 shrink-0">
                      {bottomCriterion.avg.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* 項目別平均スコア */}
          {summary.criterionAverages.length > 0 && (
            <SectionCard>
              <h2 className="text-sm font-semibold mb-3">項目別平均スコア</h2>
              <div className="space-y-2.5">
                {summary.criterionAverages.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-xs text-muted-foreground">
                        <span className={cn("font-semibold text-sm", scoreTextColorClass(c.avg))}>
                          {c.avg.toFixed(1)}
                        </span>
                        <span className="mx-1">/ 5.0</span>
                        <span>（{c.count}件）</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", scoreColorClass(c.avg))}
                        style={{ width: `${(c.avg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* 最新の総合コメント */}
          {submittedEvaluations.some((ev) => ev.overall_comment) && (
            <SectionCard>
              <h2 className="text-sm font-semibold mb-3">評価者コメント</h2>
              <div className="space-y-3">
                {submittedEvaluations
                  .filter((ev) => ev.overall_comment)
                  .slice(0, 3)
                  .map((ev) => (
                    <div key={ev.id} className="border-l-2 border-foreground/10 pl-3 text-sm">
                      <p className="whitespace-pre-wrap">{ev.overall_comment}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>— {ev.evaluator_name}</span>
                        {ev.rater_type && (
                          <span>({raterTypeLabels[ev.rater_type] ?? ev.rater_type})</span>
                        )}
                        <span>
                          ・{format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                        </span>
                        {ev.cycle_title && (
                          <span className="text-indigo-700">・評価サイクル: {ev.cycle_title}</span>
                        )}
                        {!ev.cycle_title && ev.job_title && (
                          <span className="text-sky-700">・{ev.job_title}</span>
                        )}
                      </p>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}

          {/* 個別評価一覧 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold px-1">個別評価（{evaluations.length}件）</h2>
            {evaluations.map((ev) => {
              const numericEntries = ev.criteria
                .map((c) => {
                  if (c.score_type !== "five_star" && c.score_type !== "ten_point") return null;
                  const s = ev.scores.find((sc) => sc.criterion_id === c.id);
                  if (s?.score == null) return null;
                  const normalized = normalizeScore(s.score, c.score_type);
                  return normalized == null ? null : { value: normalized };
                })
                .filter((x): x is { value: number } => x !== null);
              const evAvg =
                numericEntries.length > 0
                  ? numericEntries.reduce((sum, n) => sum + n.value, 0) / numericEntries.length
                  : null;

              return (
                <SectionCard key={ev.id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{ev.template_title}</h3>
                        <Badge variant={evaluationStatusColors[ev.status]}>
                          {evaluationStatusLabels[ev.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {ev.cycle_title ? (
                          <Badge
                            variant="secondary"
                            className="font-normal gap-1 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                          >
                            <CalendarDays className="size-3" />
                            評価サイクル: {ev.cycle_title}
                          </Badge>
                        ) : ev.job_title ? (
                          <Badge
                            variant="secondary"
                            className="font-normal gap-1 bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                          >
                            <Briefcase className="size-3" />
                            {ev.job_title}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="font-normal gap-1 text-muted-foreground"
                          >
                            <Zap className="size-3" />
                            個別評価
                          </Badge>
                        )}
                        {ev.rater_type && (
                          <Badge variant="outline" className="font-normal">
                            {raterTypeLabels[ev.rater_type] ?? ev.rater_type}評価
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {ev.evaluator_name}・
                        {format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {evAvg != null && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className={cn("font-semibold", scoreTextColorClass(evAvg))}>
                            {evAvg.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {user?.id === ev.evaluator_id && (
                        <Button variant="ghost" size="xs" onClick={() => handleEdit(ev)}>
                          編集
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ev.criteria.map((c) => {
                      const score = ev.scores.find((s) => s.criterion_id === c.id);
                      return (
                        <div
                          key={c.id}
                          className="flex items-start gap-3 text-sm py-1.5 border-b border-foreground/5 last:border-0"
                        >
                          <span className="font-medium min-w-35 shrink-0">{c.label}</span>
                          <div className="flex-1 min-w-0">
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
                                    <span className="font-medium">{score.score}/10</span>
                                  )}
                                </div>
                              )}
                            {(c.score_type === "text" || c.score_type === "select") &&
                              score?.value && <span>{score.value}</span>}
                            {score?.comment && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {score.comment}
                              </p>
                            )}
                            {!score && <span className="text-muted-foreground">-</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {ev.overall_comment && (
                    <div className="pt-3 mt-2 border-t border-foreground/10">
                      <p className="text-xs font-medium text-muted-foreground mb-1">総合コメント</p>
                      <p className="text-sm whitespace-pre-wrap">{ev.overall_comment}</p>
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </>
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
