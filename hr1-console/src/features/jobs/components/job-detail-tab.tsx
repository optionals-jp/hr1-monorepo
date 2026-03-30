"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Job, JobStep, Interview } from "@/types/database";
import { GripVertical } from "lucide-react";
import { format } from "date-fns";
import {
  StepType,
  FORM_STEP_TYPES,
  stepTypeLabels,
  jobStatusLabels as statusLabels,
} from "@/lib/constants";
import type { MutableRefObject } from "react";

interface JobDetailTabProps {
  job: Job;
  steps: JobStep[];
  forms: { id: string; title: string }[];
  interviews: Interview[];
  reorderMode: boolean;
  setReorderMode: (v: boolean) => void;
  dragIndex: number | null;
  setDragIndex: (v: number | null) => void;
  dragOverIndex: number | null;
  setDragOverIndex: (v: number | null) => void;
  confirmingReorder: boolean;
  confirmReorder: () => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  stepsBeforeReorderRef: MutableRefObject<JobStep[]>;
  setSteps: (fn: (prev: JobStep[]) => JobStep[]) => void;
  startEditStep: (step: JobStep) => void;
  startEditingInfo: () => void;
  openAddStep: () => void;
}

export function JobDetailTab({
  job,
  steps,
  forms,
  interviews,
  reorderMode,
  setReorderMode,
  dragIndex,
  setDragIndex,
  dragOverIndex,
  setDragOverIndex,
  confirmingReorder,
  confirmReorder,
  reorderSteps,
  stepsBeforeReorderRef,
  setSteps,
  startEditStep,
  startEditingInfo,
  openAddStep,
}: JobDetailTabProps) {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* 求人情報セクション */}
      <section>
        <div className="rounded-lg bg-white border">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">求人情報</h2>
            <Button variant="outline" size="sm" onClick={startEditingInfo}>
              編集
            </Button>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">タイトル</span>
              <span className="font-medium">{job.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">部署</span>
              <span>{job.department ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">勤務地</span>
              <span>{job.location ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">雇用形態</span>
              <span>{job.employment_type ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">年収</span>
              <span>{job.salary_range ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ステータス</span>
              <Badge
                variant={
                  job.status === "open"
                    ? "default"
                    : job.status === "closed"
                      ? "destructive"
                      : "outline"
                }
              >
                {statusLabels[job.status]}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">作成日</span>
              <span>{format(new Date(job.created_at), "yyyy/MM/dd")}</span>
            </div>
            {job.description && (
              <div className="pt-3 border-t">
                <p className="text-muted-foreground mb-1">説明</p>
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 選考ステップセクション */}
      <section>
        <div className="rounded-lg bg-white border">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              選考ステップ
              <span className="ml-1.5 text-xs font-normal">
                {steps.filter((s) => s.step_type !== StepType.Offer).length + 1}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {!reorderMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={steps.length < 2}
                    onClick={() => {
                      stepsBeforeReorderRef.current = [...steps];
                      setReorderMode(true);
                    }}
                  >
                    並び替え
                  </Button>
                  <Button variant="outline" size="sm" onClick={openAddStep}>
                    追加
                  </Button>
                </>
              )}
              {reorderMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={confirmingReorder}
                    onClick={() => {
                      setSteps(() => stepsBeforeReorderRef.current);
                      setReorderMode(false);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button size="sm" onClick={confirmReorder} disabled={confirmingReorder}>
                    {confirmingReorder ? "保存中..." : "確定"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div
            onDragOver={reorderMode ? (e) => e.preventDefault() : undefined}
            onDrop={
              reorderMode
                ? () => {
                    if (
                      dragIndex !== null &&
                      dragOverIndex !== null &&
                      dragIndex !== dragOverIndex
                    ) {
                      reorderSteps(dragIndex, dragOverIndex);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }
                : undefined
            }
          >
            {steps
              .filter((s) => s.step_type !== StepType.Offer)
              .map((step, index) => (
                <div
                  key={step.id}
                  draggable={reorderMode}
                  onDragStart={reorderMode ? () => setDragIndex(index) : undefined}
                  onDragOver={
                    reorderMode
                      ? (e) => {
                          e.preventDefault();
                          if (index !== dragIndex) setDragOverIndex(index);
                        }
                      : undefined
                  }
                  onDragEnd={
                    reorderMode
                      ? () => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }
                      : undefined
                  }
                  onClick={!reorderMode ? () => startEditStep(step) : undefined}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 border-b",
                    reorderMode ? "cursor-grab" : "cursor-pointer hover:bg-accent/40",
                    reorderMode && dragOverIndex === index && dragIndex !== index && "bg-accent/60"
                  )}
                >
                  <GripVertical
                    className={cn(
                      "h-4 w-4 shrink-0",
                      reorderMode ? "text-muted-foreground" : "text-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {stepTypeLabels[step.step_type] ?? step.step_type}
                      {step.related_id &&
                        FORM_STEP_TYPES.includes(step.step_type as StepType) &&
                        forms.find((f) => f.id === step.related_id) && (
                          <>
                            {" — "}
                            <Link
                              href={`/forms/${step.related_id}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {forms.find((f) => f.id === step.related_id)!.title}
                            </Link>
                          </>
                        )}
                      {step.related_id &&
                        step.step_type === StepType.Interview &&
                        (() => {
                          const iv = interviews.find((i) => i.id === step.related_id);
                          if (!iv) return null;
                          return (
                            <>
                              {" — "}
                              <Link
                                href={`/scheduling/${iv.id}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {iv.title}
                              </Link>
                            </>
                          );
                        })()}
                    </p>
                  </div>
                </div>
              ))}
            {/* 末尾ドロップゾーン */}
            {reorderMode && (
              <div
                className={cn(
                  "h-10 border-b transition-colors",
                  dragOverIndex !== null &&
                    dragOverIndex >= steps.filter((s) => s.step_type !== StepType.Offer).length &&
                    dragIndex !== null &&
                    "bg-accent/60"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  const count = steps.filter((s) => s.step_type !== StepType.Offer).length;
                  setDragOverIndex(count);
                }}
              />
            )}
            {/* 内定ステップ（固定・末尾） */}
            <div className="flex items-center gap-3 px-5 py-4 bg-muted/30">
              <div className="h-4 w-4 shrink-0" />
              <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0">
                ✓
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">内定</p>
                <p className="text-xs text-muted-foreground">すべてのステップ完了後に自動適用</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
