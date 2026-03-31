"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EvalWithScores } from "@/lib/hooks/use-evaluation-detail";
import type { EvaluationCriterion } from "@/types/database";
import { Star } from "lucide-react";
import { scoreTypeLabels } from "@/lib/constants";

export function ComparisonView({
  criteria,
  evaluations,
}: {
  criteria: EvaluationCriterion[];
  evaluations: EvalWithScores[];
}) {
  const submitted = evaluations.filter((e) => e.status === "submitted");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Default: show all submitted (up to 6)
  const toCompare =
    selectedIds.length > 0
      ? submitted.filter((e) => selectedIds.includes(e.id))
      : submitted.slice(0, 6);

  if (submitted.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">提出済みの評価がありません</p>;
  }

  const toggleSelect = (evalId: string) => {
    setSelectedIds((prev) =>
      prev.includes(evalId) ? prev.filter((id) => id !== evalId) : [...prev, evalId]
    );
  };

  return (
    <div className="space-y-4">
      {/* 評価選択 */}
      {submitted.length > 6 && (
        <div className="space-y-2">
          <Label className="text-sm">比較する評価を選択（最大6件）</Label>
          <div className="flex flex-wrap gap-2">
            {submitted.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggleSelect(ev.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md border text-sm transition-colors",
                  (selectedIds.length === 0 ? toCompare : submitted)
                    .filter((e) =>
                      selectedIds.length > 0 ? selectedIds.includes(e.id) : toCompare.includes(e)
                    )
                    .some((e) => e.id === ev.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-muted"
                )}
                disabled={selectedIds.length >= 6 && !selectedIds.includes(ev.id)}
              >
                {ev.target_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 比較テーブル */}
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 min-w-40">
                評価項目
              </th>
              {toCompare.map((ev) => (
                <th key={ev.id} className="p-3 font-medium text-center min-w-35">
                  <div>{ev.target_name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {ev.evaluator_name}
                  </div>
                </th>
              ))}
              {toCompare.length > 1 &&
                criteria.some(
                  (c) => c.score_type === "five_star" || c.score_type === "ten_point"
                ) && <th className="p-3 font-medium text-center min-w-25 bg-muted/30">平均</th>}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => {
              const isNumeric = c.score_type === "five_star" || c.score_type === "ten_point";
              const numericScores: number[] = [];

              return (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="p-3 font-medium sticky left-0 bg-white">
                    <div>{c.label}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {scoreTypeLabels[c.score_type]}
                    </div>
                  </td>
                  {toCompare.map((ev) => {
                    const score = ev.scores.find((s) => s.criterion_id === c.id);

                    if (isNumeric && score?.score != null) {
                      numericScores.push(score.score);
                    }

                    return (
                      <td key={ev.id} className="p-3 text-center">
                        {c.score_type === "five_star" && score?.score != null ? (
                          <div className="flex justify-center gap-0.5">
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
                          </div>
                        ) : c.score_type === "ten_point" && score?.score != null ? (
                          <span className="font-semibold">{score.score}/10</span>
                        ) : c.score_type === "select" && score?.value ? (
                          <Badge variant="secondary">{score.value}</Badge>
                        ) : c.score_type === "text" && score?.value ? (
                          <span className="text-left block text-xs">{score.value}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {score?.comment && (
                          <p className="text-xs text-muted-foreground mt-1">{score.comment}</p>
                        )}
                      </td>
                    );
                  })}
                  {toCompare.length > 1 &&
                    criteria.some(
                      (cr) => cr.score_type === "five_star" || cr.score_type === "ten_point"
                    ) && (
                      <td className="p-3 text-center bg-muted/30">
                        {isNumeric && numericScores.length > 0 ? (
                          <span className="font-semibold">
                            {(
                              numericScores.reduce((a, b) => a + b, 0) / numericScores.length
                            ).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                </tr>
              );
            })}
            {/* 総合コメント行 */}
            <tr className="border-t-2">
              <td className="p-3 font-medium sticky left-0 bg-white">総合コメント</td>
              {toCompare.map((ev) => (
                <td key={ev.id} className="p-3 text-xs">
                  {ev.overall_comment ?? <span className="text-muted-foreground">-</span>}
                </td>
              ))}
              {toCompare.length > 1 &&
                criteria.some(
                  (c) => c.score_type === "five_star" || c.score_type === "ten_point"
                ) && <td className="p-3 bg-muted/30" />}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
