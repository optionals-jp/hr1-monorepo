"use client";

import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { StarRating } from "./star-rating";
import { cn } from "@hr1/shared-ui/lib/utils";
import type { EvaluationCriterion, EvaluationAnchor } from "@/types/database";

interface ScoreValue {
  score: number | null;
  value: string | null;
  comment: string | null;
}

interface CriterionFieldProps {
  criterion: EvaluationCriterion & { evaluation_anchors: EvaluationAnchor[] };
  scoreValue: ScoreValue;
  onChange: (val: ScoreValue) => void;
  disabled?: boolean;
}

export function CriterionField({ criterion, scoreValue, onChange, disabled }: CriterionFieldProps) {
  const anchors = criterion.evaluation_anchors ?? [];
  const currentAnchor = anchors.find((a) => a.score_value === scoreValue.score);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">{criterion.label}</Label>
          {criterion.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
          )}
          {criterion.weight !== 1 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              (重み: {criterion.weight})
            </span>
          )}
        </div>

        {criterion.score_type === "five_star" && (
          <div>
            <StarRating
              value={scoreValue.score}
              onChange={(score) => onChange({ ...scoreValue, score })}
              disabled={disabled}
            />
            {currentAnchor && (
              <p className="text-xs text-blue-600 mt-1">{currentAnchor.description}</p>
            )}
          </div>
        )}

        {criterion.score_type === "ten_point" && (
          <div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...scoreValue, score: n })}
                  className={cn(
                    "w-9 h-9 rounded-md text-sm font-medium border transition-colors",
                    scoreValue.score === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input",
                    disabled && "cursor-default opacity-60"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {currentAnchor && (
              <p className="text-xs text-blue-600 mt-1">{currentAnchor.description}</p>
            )}
          </div>
        )}

        {criterion.score_type === "text" && (
          <textarea
            value={scoreValue.value ?? ""}
            onChange={(e) => onChange({ ...scoreValue, value: e.target.value })}
            disabled={disabled}
            rows={3}
            placeholder="回答を入力してください"
            className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        )}

        {criterion.score_type === "select" && criterion.options && (
          <Select
            value={scoreValue.value ?? ""}
            onValueChange={(v) => onChange({ ...scoreValue, value: v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {criterion.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">コメント</Label>
          <textarea
            value={scoreValue.comment ?? ""}
            onChange={(e) => onChange({ ...scoreValue, comment: e.target.value })}
            disabled={disabled}
            rows={2}
            placeholder="コメント（任意）"
            className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
