"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { getSupabase } from "@/lib/supabase/browser";
import * as evalRepo from "@/lib/repositories/evaluation-repository";
import { CriterionField } from "./criterion-field";
import { RATER_TYPE_LABELS } from "@/lib/evaluation-utils";
import { ArrowLeft, Save, Send } from "lucide-react";
import type {
  EvaluationCriterion,
  EvaluationAnchor,
  EvaluationAssignment,
  EvaluationCycle,
} from "@/types/database";

type CriterionWithAnchors = EvaluationCriterion & { evaluation_anchors: EvaluationAnchor[] };
type ScoreMap = Record<
  string,
  { score: number | null; value: string | null; comment: string | null }
>;

export default function EvaluationFormPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { organization } = useOrg();
  const { showToast } = useToast();

  const assignmentId = params.assignmentId as string;
  const [assignment, setAssignment] = useState<
    (EvaluationAssignment & { evaluation_cycles: EvaluationCycle }) | null
  >(null);
  const [criteria, setCriteria] = useState<CriterionWithAnchors[]>([]);
  const [scores, setScores] = useState<ScoreMap>({});
  const [overallComment, setOverallComment] = useState("");
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load assignment, criteria, and existing evaluation
  useEffect(() => {
    if (!user || !organization) return;
    let cancelled = false;
    const load = async () => {
      try {
        const a = await evalRepo.fetchAssignmentDetail(getSupabase(), assignmentId, user.id);
        if (cancelled) return;
        setAssignment(a);

        if (a.status === "submitted") setIsSubmitted(true);

        const c = await evalRepo.fetchCriteriaForTemplate(
          getSupabase(),
          a.evaluation_cycles.template_id
        );
        if (cancelled) return;
        setCriteria(c);

        const existing = await evalRepo.fetchExistingEvaluation(
          getSupabase(),
          assignmentId,
          user.id
        );
        if (cancelled) return;
        if (existing) {
          setEvaluationId(existing.id);
          setOverallComment(existing.overall_comment ?? "");
          const map: ScoreMap = {};
          for (const s of existing.evaluation_scores) {
            map[s.criterion_id] = {
              score: s.score,
              value: s.value,
              comment: s.comment,
            };
          }
          setScores(map);
        }
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load evaluation data:", e);
        setError(e instanceof Error ? e : new Error("読み込みに失敗しました"));
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, organization, assignmentId]);

  const ensureEvaluation = useCallback(async () => {
    if (evaluationId) return evaluationId;
    if (!user || !organization || !assignment) return null;

    const id = await evalRepo.createEvaluation(getSupabase(), {
      organization_id: organization.id,
      template_id: assignment.evaluation_cycles.template_id,
      target_user_id: assignment.target_user_id,
      evaluator_id: user.id,
      cycle_id: assignment.cycle_id,
      rater_type: assignment.rater_type,
      assignment_id: assignmentId,
    });
    setEvaluationId(id);
    return id;
  }, [evaluationId, user, organization, assignment, assignmentId]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const id = await ensureEvaluation();
      if (!id) return;
      const scoreList = Object.entries(scores).map(([criterion_id, val]) => ({
        criterion_id,
        ...val,
      }));
      if (scoreList.length > 0) {
        await evalRepo.upsertScores(getSupabase(), id, scoreList);
      }
      await evalRepo.saveOverallComment(getSupabase(), id, overallComment.trim() || null);
      showToast("下書きを保存しました");
    } catch (e) {
      console.error("Failed to save draft:", e);
      showToast("保存に失敗しました", "error");
    }
    setSaving(false);
  }, [ensureEvaluation, scores, overallComment, showToast]);

  const handleScoreChange = useCallback((criterionId: string, val: ScoreMap[string]) => {
    setScores((prev) => ({ ...prev, [criterionId]: val }));
  }, []);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const id = await ensureEvaluation();
      if (!id) return;
      const scoreList = Object.entries(scores).map(([criterion_id, val]) => ({
        criterion_id,
        ...val,
      }));
      await evalRepo.upsertScores(getSupabase(), id, scoreList);
      await evalRepo.saveOverallComment(getSupabase(), id, overallComment.trim() || null);
      await evalRepo.submitEvaluation(getSupabase(), id, assignmentId);
      setIsSubmitted(true);
      showToast("評価を提出しました");
    } catch (e) {
      console.error("Failed to submit evaluation:", e);
      showToast("提出に失敗しました", "error");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <PageHeader title="評価入力" sticky={false} border={false} />
        <PageContent>
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        </PageContent>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <PageHeader title="評価入力" sticky={false} border={false} />
        <PageContent>
          <QueryErrorBanner error={error} onRetry={() => window.location.reload()} />
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={
          assignment?.target_profile?.display_name
            ? `${assignment.target_profile.display_name} の評価`
            : "評価入力"
        }
        sticky={false}
        border={false}
        action={
          <Button variant="ghost" size="sm" onClick={() => router.push("/evaluations")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            一覧に戻る
          </Button>
        }
      />
      <PageContent>
        <div className="max-w-2xl space-y-4">
          {/* Header info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {RATER_TYPE_LABELS[assignment?.rater_type ?? ""] ?? assignment?.rater_type}
            </Badge>
            <span>{assignment?.evaluation_cycles.title}</span>
            {isSubmitted && (
              <Badge variant="default" className="text-[10px]">
                提出済み
              </Badge>
            )}
          </div>

          {/* Progress */}
          {criteria.length > 0 && (
            <div className="text-xs text-muted-foreground">
              入力済み:{" "}
              {
                Object.keys(scores).filter((k) => {
                  const v = scores[k];
                  return v.score != null || (v.value != null && v.value !== "");
                }).length
              }{" "}
              / {criteria.length} 項目
            </div>
          )}

          {/* Criteria fields */}
          {criteria.map((c) => (
            <CriterionField
              key={c.id}
              criterion={c}
              scoreValue={scores[c.id] ?? { score: null, value: null, comment: null }}
              onChange={(val) => handleScoreChange(c.id, val)}
              disabled={isSubmitted}
            />
          ))}

          {/* Overall comment */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">総合コメント</Label>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              disabled={isSubmitted}
              rows={4}
              placeholder="総合的な評価コメントを入力してください"
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Actions */}
          {!isSubmitted && (
            <div className="flex gap-2 justify-end pb-8">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "保存中..." : "下書き保存"}
              </Button>
              <Button size="sm" onClick={() => setShowSubmitConfirm(true)} disabled={submitting}>
                <Send className="h-4 w-4 mr-1" />
                提出する
              </Button>
            </div>
          )}

          {/* Submit confirmation dialog */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-lg">
                <h3 className="text-sm font-semibold mb-2">評価を提出しますか？</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  提出後は変更できません。内容をご確認ください。
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowSubmitConfirm(false)}>
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    disabled={submitting}
                    onClick={async () => {
                      setShowSubmitConfirm(false);
                      await handleSubmit();
                    }}
                  >
                    {submitting ? "提出中..." : "提出する"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
