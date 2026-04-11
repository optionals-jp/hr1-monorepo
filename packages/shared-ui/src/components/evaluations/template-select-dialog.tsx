"use client";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DialogPanel } from "../ui/dialog";
import type { EvaluationTemplateRef, EvaluationTarget } from "../../lib/evaluation-types";

/**
 * 評価テンプレート選択ダイアログで target ごとの表示ラベルを差し替えるためのマップ。
 * アプリごとに「候補者向け」「応募者向け」など表記が変わるため、呼び出し元から注入する。
 */
export type EvaluationTargetLabels = Record<EvaluationTarget, string>;

const DEFAULT_EVAL_TYPE_LABELS: Record<string, string> = {
  multi_rater: "多面評価",
  single: "単独評価",
};

export interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EvaluationTemplateRef[];
  onSelect: (templateId: string) => void;
  targetLabels: EvaluationTargetLabels;
}

/**
 * 評価テンプレートを選択するダイアログ。
 *
 * hr1-console / hr1-employee-web で文言（特に "applicant" の呼び方）が異なるため、
 * `targetLabels` prop で target → 表示名のマップを注入する設計にする。
 */
export function TemplateSelectDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
  targetLabels,
}: TemplateSelectDialogProps) {
  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title="評価シートを選択"
      description="使用する評価シートを選んでください"
      size="md"
      bodyClassName="p-4"
      footer={
        <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
          キャンセル
        </Button>
      }
    >
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
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {targetLabels[t.target]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {DEFAULT_EVAL_TYPE_LABELS[t.evaluation_type] ?? t.evaluation_type}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </DialogPanel>
  );
}
