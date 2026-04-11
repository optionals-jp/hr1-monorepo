"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { cn } from "@hr1/shared-ui/lib/utils";
import { scoreTypeLabels } from "@/lib/constants";
import type { EvaluationTemplate, EvaluationCriterion, EvaluationAnchor } from "@/types/database";
import { Star } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

export interface ScoreDraft {
  criterion_id: string;
  score: number | null;
  value: string;
  comment: string;
}

export interface EvaluationFormDialogProps {
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
}

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
}: EvaluationFormDialogProps) {
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
              <Button variant="primary" onClick={() => onSubmit("submitted")} disabled={saving}>
                {saving ? "保存中..." : "評価を提出"}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
