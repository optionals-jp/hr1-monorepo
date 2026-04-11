"use client";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DialogPanel } from "../ui/dialog";
import { cn } from "../../lib/utils";
import { Star } from "lucide-react";
import type {
  EvaluationAnchorRef,
  EvaluationCriterionRef,
  EvaluationTemplateRef,
  ScoreDraft,
} from "../../lib/evaluation-types";

export type { ScoreDraft } from "../../lib/evaluation-types";

/**
 * スコアタイプ（five_star / ten_point / text / select）の表示ラベルマップ。
 * 呼び出し元の constants から注入する。
 */
export type ScoreTypeLabels = Record<string, string>;

export interface EvaluationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** テンプレート選択プルダウンを表示する場合は templates と onTemplateChange を渡す */
  templates?: EvaluationTemplateRef[];
  selectedTemplateId?: string;
  onTemplateChange?: (templateId: string | null) => void;
  formCriteria: EvaluationCriterionRef[];
  formAnchors: EvaluationAnchorRef[];
  scores: ScoreDraft[];
  updateScore: (criterionId: string, field: string, value: string | number | null) => void;
  overallComment: string;
  setOverallComment: (v: string) => void;
  saving: boolean;
  onSubmit: (status: "draft" | "submitted") => void;
  scoreTypeLabels: ScoreTypeLabels;
}

/**
 * 評価入力ダイアログ。
 *
 * 1 評価項目ごとにスコアタイプ（5段階/10点/テキスト/選択式）に応じた入力 UI を出す。
 * 5段階・10点の場合はアンカー（各スコアの行動基準）を補助表示する。
 */
export function EvaluationFormDialog({
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
  scoreTypeLabels,
}: EvaluationFormDialogProps) {
  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="xl"
      bodyClassName="p-6 space-y-4"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onSubmit("draft")} disabled={saving}>
              下書き保存
            </Button>
            <Button variant="primary" onClick={() => onSubmit("submitted")} disabled={saving}>
              {saving ? "保存中..." : "評価を提出"}
            </Button>
          </div>
        </div>
      }
    >
      <>
        {onTemplateChange && templates && (
          <div className="space-y-2">
            <Label>評価シート *</Label>
            <Select value={selectedTemplateId ?? ""} onValueChange={onTemplateChange}>
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
                  {scoreTypeLabels[c.score_type] ?? c.score_type}
                </Badge>
              </div>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}

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
                            title={criterionAnchors.find((a) => a.score_value === n)?.description}
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
      </>
    </DialogPanel>
  );
}
