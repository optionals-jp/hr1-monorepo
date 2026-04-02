"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StepStatus, StepType, stepStatusLabels, stepTypeLabels } from "@/lib/constants";
import type { ApplicationStep } from "@/types/database";
import {
  Check,
  Circle,
  SkipForward,
  FileText,
  Calendar,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";

interface ApplicationStepsTabProps {
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses: (step: ApplicationStep) => void;
  evaluationCount?: number;
  onOpenEvaluation?: () => void;
}

export function ApplicationStepsTab({
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
  evaluationCount,
  onOpenEvaluation,
}: ApplicationStepsTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      <section>
        <div className="rounded-lg bg-white border">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              選考ステップ
              <span className="ml-1.5 text-xs font-normal">{steps.length}</span>
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <ApplicationStepList
              steps={steps}
              canActOnStep={canActOnStep}
              advanceStep={advanceStep}
              skipStep={skipStep}
              unskipStep={unskipStep}
              onViewFormResponses={onViewFormResponses}
              evaluationCount={evaluationCount}
              onOpenEvaluation={onOpenEvaluation}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/** ステップ一覧コンポーネント */
export function ApplicationStepList({
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
  evaluationCount,
  onOpenEvaluation,
}: {
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses?: (step: ApplicationStep) => void;
  evaluationCount?: number;
  onOpenEvaluation?: () => void;
}) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">選考ステップがありません</p>
    );
  }

  return (
    <>
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            step.status === StepStatus.InProgress ? "border-primary bg-primary/5" : ""
          }`}
        >
          {/* Icon */}
          <div className="shrink-0">
            {step.status === StepStatus.Completed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-4 w-4" />
              </div>
            ) : step.status === StepStatus.InProgress ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Circle className="h-4 w-4 fill-current" />
              </div>
            ) : step.status === StepStatus.Skipped ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                <SkipForward className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <span className="text-xs font-bold">{step.step_order}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{step.label}</p>
              <Badge variant="outline" className="text-xs">
                {stepTypeLabels[step.step_type] ?? step.step_type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {stepStatusLabels[step.status]}
              {step.started_at &&
                step.status === StepStatus.InProgress &&
                ` (開始: ${format(new Date(step.started_at), "yyyy/MM/dd")})`}
              {step.completed_at &&
                step.status === StepStatus.Completed &&
                ` (完了: ${format(new Date(step.completed_at), "yyyy/MM/dd")})`}
            </p>
            {/* 紐付けリソースへのリンク */}
            {step.related_id && <ResourceLink step={step} />}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            {step.step_type === StepType.Form &&
              step.status === StepStatus.Completed &&
              step.related_id &&
              onViewFormResponses && (
                <Button size="sm" variant="outline" onClick={() => onViewFormResponses(step)}>
                  回答を確認
                </Button>
              )}
            {step.step_type === StepType.Interview &&
              step.status === StepStatus.Completed &&
              onOpenEvaluation && (
                <Button size="sm" variant="outline" onClick={onOpenEvaluation}>
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                  評価する
                  {evaluationCount != null && evaluationCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                      {evaluationCount}
                    </Badge>
                  )}
                </Button>
              )}
            {step.status === StepStatus.Skipped && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => unskipStep(step)}
                className="text-orange-600 hover:text-orange-700"
              >
                元に戻す
              </Button>
            )}
            {canActOnStep(step) && step.status !== StepStatus.Skipped && (
              <>
                <Button
                  size="sm"
                  variant={step.status === StepStatus.InProgress ? "default" : "outline"}
                  onClick={() => advanceStep(step)}
                >
                  {step.status === StepStatus.Pending ? "開始" : "完了"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => skipStep(step)}
                  className="text-muted-foreground"
                >
                  スキップ
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

/** ステップに紐付いたリソースへのリンク */
function ResourceLink({ step }: { step: ApplicationStep }) {
  if (step.step_type === StepType.Form && step.related_id) {
    return (
      <Link
        href={`/forms/${step.related_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="h-3 w-3" />
        フォームを確認
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  if (step.step_type === StepType.Interview && step.related_id) {
    return (
      <Link
        href={`/scheduling/${step.related_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar className="h-3 w-3" />
        面接詳細を確認
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  return null;
}
