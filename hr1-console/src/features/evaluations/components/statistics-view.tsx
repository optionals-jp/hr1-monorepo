"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EvalWithScores } from "@/lib/hooks/use-evaluation-detail";
import type { EvaluationCriterion } from "@/types/database";
import { Star } from "lucide-react";
import { scoreTypeLabels } from "@/lib/constants";

export function StatisticsView({
  criteria,
  evaluations,
}: {
  criteria: EvaluationCriterion[];
  evaluations: EvalWithScores[];
}) {
  const submitted = evaluations.filter((e) => e.status === "submitted");

  if (submitted.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">提出済みの評価がありません</p>;
  }

  // Collect all scores grouped by criterion
  const allScores = submitted.flatMap((e) => e.scores);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 概要カード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総評価数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{evaluations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              提出済み {submitted.length} / 下書き {evaluations.length - submitted.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">対象者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(submitted.map((e) => e.target_user_id)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">評価者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(submitted.map((e) => e.evaluator_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 項目ごとの統計 */}
      {criteria.map((c) => {
        const criterionScores = allScores.filter((s) => s.criterion_id === c.id);

        if (c.score_type === "five_star" || c.score_type === "ten_point") {
          const numericScores = criterionScores
            .map((s) => s.score)
            .filter((s): s is number => s !== null);
          const avg =
            numericScores.length > 0
              ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
              : 0;
          const max = c.score_type === "five_star" ? 5 : 10;

          // Distribution
          const dist = new Map<number, number>();
          for (let i = 1; i <= max; i++) dist.set(i, 0);
          for (const s of numericScores) {
            dist.set(s, (dist.get(s) ?? 0) + 1);
          }
          const maxCount = Math.max(...dist.values(), 1);

          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {scoreTypeLabels[c.score_type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">
                    {numericScores.length > 0 ? avg.toFixed(1) : "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    / {max}
                    <span className="ml-2">（{numericScores.length}件）</span>
                  </div>
                  {c.score_type === "five_star" && numericScores.length > 0 && (
                    <div className="flex gap-0.5 ml-auto">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "h-5 w-5",
                            n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* 分布バー */}
                <div className="space-y-1">
                  {Array.from(dist.entries())
                    .sort(([a], [b]) => b - a)
                    .map(([score, count]) => (
                      <div key={score} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-right text-muted-foreground">{score}</span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (c.score_type === "select" && c.options) {
          // 選択肢の分布
          const valueCounts = new Map<string, number>();
          for (const opt of c.options) valueCounts.set(opt, 0);
          for (const s of criterionScores) {
            if (s.value) valueCounts.set(s.value, (valueCounts.get(s.value) ?? 0) + 1);
          }
          const total = criterionScores.filter((s) => s.value).length;
          const maxCount = Math.max(...valueCounts.values(), 1);

          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {scoreTypeLabels[c.score_type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">回答数: {total}件</p>
                <div className="space-y-1">
                  {Array.from(valueCounts.entries()).map(([opt, count]) => (
                    <div key={opt} className="flex items-center gap-2 text-sm">
                      <span className="w-24 truncate text-muted-foreground">{opt}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        // text type
        const textResponses = criterionScores.filter((s) => s.value);
        return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{c.label}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {scoreTypeLabels[c.score_type]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">回答数: {textResponses.length}件</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
