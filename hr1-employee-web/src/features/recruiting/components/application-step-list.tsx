"use client";

import Link from "next/link";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { StepStatus, StepType } from "@/lib/constants";
import type { ApplicationStep } from "@/types/database";
import { FileText, Calendar, ExternalLink, Pencil, Trash2, Plus } from "lucide-react";
import { formatYmdSlash } from "@/lib/datetime-utils";
import {
  StepCardShell,
  StepRow,
  StepTypeBadge,
} from "@/features/recruiting/components/selection-step-card";

interface ApplicationStepListProps {
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses?: (step: ApplicationStep) => void;
  onOffer?: () => void;
  onReject?: () => void;
  onEditAdHoc?: (step: ApplicationStep) => void;
  onDeleteAdHoc?: (step: ApplicationStep) => void;
  /** ホバー時に「ここに追加」ボタンを表示。指定ステップの「前」に挿入する。 */
  onAddBefore?: (step: ApplicationStep) => void;
}

export function ApplicationStepList({
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
  onOffer,
  onReject,
  onEditAdHoc,
  onDeleteAdHoc,
  onAddBefore,
}: ApplicationStepListProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">選考ステップがありません</p>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.status === StepStatus.Completed;
        const isInProgress = step.status === StepStatus.InProgress;
        const isSkipped = step.status === StepStatus.Skipped;
        const canInsertBefore =
          !!onAddBefore &&
          (step.status === StepStatus.Pending || step.status === StepStatus.InProgress);

        return (
          <div key={step.id} className="group/insert relative pt-3 first:pt-0">
            {canInsertBefore && (
              <button
                type="button"
                onClick={() => onAddBefore!(step)}
                aria-label={`「${step.label}」の前にステップを追加`}
                className="absolute left-12 top-0 z-10 inline-flex items-center gap-1 rounded-full border border-dashed border-primary/50 bg-background px-2.5 py-0.5 text-xs font-medium text-primary opacity-0 shadow-sm transition-opacity hover:border-primary hover:bg-primary hover:text-primary-foreground hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/insert:opacity-100 group-focus-within/insert:opacity-100"
              >
                <Plus className="h-3 w-3" />
                ここに追加
              </button>
            )}
            <StepRow index={index} isLast={isLast} status={step.status}>
              <StepCardShell highlight={isInProgress} dimmed={isSkipped}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold leading-snug">{step.label}</h3>
                      {step.source === "ad_hoc" && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          追加
                        </Badge>
                      )}
                      {step.is_optional && (
                        <Badge variant="outline" className="text-xs">
                          任意
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          完了
                        </Badge>
                      )}
                      {isInProgress && (
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                          進行中
                        </Badge>
                      )}
                    </div>
                  </div>
                  <StepTypeBadge stepType={step.step_type} />
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {step.started_at && isInProgress && `開始: ${formatYmdSlash(step.started_at)}`}
                  {step.completed_at && isCompleted && `完了: ${formatYmdSlash(step.completed_at)}`}
                  {isSkipped && "スキップ"}
                  {step.status === StepStatus.Pending && "未着手"}
                </p>

                {step.description && (
                  <p className="text-sm text-muted-foreground mt-2.5 whitespace-pre-wrap">
                    {step.description}
                  </p>
                )}

                {(step.form_id || step.interview_id) && (
                  <div className="mt-2">
                    <ResourceLink step={step} />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {step.form_id &&
                    (isCompleted || (isInProgress && step.applicant_action_at)) &&
                    onViewFormResponses && (
                      <Button size="xs" variant="outline" onClick={() => onViewFormResponses(step)}>
                        回答を確認
                      </Button>
                    )}
                  {step.document_url &&
                    (isCompleted || (isInProgress && step.applicant_action_at)) && (
                      <Button
                        size="xs"
                        variant="outline"
                        render={
                          <a
                            href={step.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        書類を確認
                      </Button>
                    )}
                  {isSkipped && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => unskipStep(step)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      元に戻す
                    </Button>
                  )}
                  {step.source === "ad_hoc" && step.status === StepStatus.Pending && (
                    <>
                      {onEditAdHoc && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onEditAdHoc(step)}
                          className="text-muted-foreground"
                          aria-label="ステップを編集"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteAdHoc && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => onDeleteAdHoc(step)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="ステップを削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                  {canActOnStep(step) &&
                    !isSkipped &&
                    (step.step_type === StepType.Offer && isInProgress ? (
                      <>
                        <Button size="xs" variant="default" onClick={onOffer}>
                          内定
                        </Button>
                        <Button size="xs" variant="destructive" onClick={onReject}>
                          不合格
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="xs"
                          variant={isInProgress ? "default" : "outline"}
                          onClick={() => advanceStep(step)}
                        >
                          {step.status === StepStatus.Pending ? "開始" : "完了"}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => skipStep(step)}
                          className="text-muted-foreground"
                        >
                          スキップ
                        </Button>
                      </>
                    ))}
                </div>
              </StepCardShell>
            </StepRow>
          </div>
        );
      })}
    </div>
  );
}

function ResourceLink({ step }: { step: ApplicationStep }) {
  if (step.form_id) {
    return (
      <Link
        href={`/forms/${step.form_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="h-3 w-3" />
        フォームを確認
        <ExternalLink className="h-3 w-3" />
      </Link>
    );
  }

  if (step.interview_id) {
    return (
      <Link
        href={`/scheduling/${step.interview_id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
