"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import type { Job, JobStep, Interview, Application } from "@/types/database";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Users, CheckCircle2, Clock, XCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import {
  StepType,
  stepTypeLabels,
  screeningTypeLabels,
  jobStatusLabels as statusLabels,
} from "@/lib/constants";

interface JobDetailTabProps {
  job: Job;
  steps: JobStep[];
  applications: Application[];
  forms: { id: string; title: string }[];
  interviews: Interview[];
  startEditingInfo: () => void;
  onEditSteps: () => void;
}

export function JobDetailTab({
  job,
  steps,
  applications,
  forms,
  interviews,
  startEditingInfo,
  onEditSteps,
}: JobDetailTabProps) {
  const activeApps = applications.filter((a) => a.status === "active");
  const offeredApps = applications.filter((a) => a.status === "offered");
  const rejectedApps = applications.filter((a) => a.status === "rejected");
  const withdrawnApps = applications.filter((a) => a.status === "withdrawn");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard className="self-start">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">求人情報</h2>
          <Button variant="outline" size="xs" onClick={startEditingInfo}>
            編集
          </Button>
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">部署</span>
            <span>{job.department ?? "-"}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">勤務地</span>
            <span>{job.location ?? "-"}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">雇用形態</span>
            <span>{job.employment_type ?? "-"}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">年収</span>
            <span>{job.salary_range ?? "-"}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">ステータス</span>
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
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">作成日</span>
            <span>{format(new Date(job.created_at), "yyyy/MM/dd")}</span>
          </div>
        </div>
        {job.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              説明
            </p>
            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
      </SectionCard>

      <div className="lg:col-span-2 space-y-6">
        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">応募サマリー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">総応募数</span>
              </div>
              <span className="text-2xl font-bold">{applications.length}</span>
            </div>
            <div className="rounded-xl bg-white border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="size-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">選考中</span>
              </div>
              <span className="text-2xl font-bold">{activeApps.length}</span>
            </div>
            <div className="rounded-xl bg-white border p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="size-4 text-green-500" />
                <span className="text-xs text-muted-foreground">内定</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{offeredApps.length}</span>
            </div>
            <div className="rounded-xl bg-white border p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="size-4 text-red-400" />
                <span className="text-xs text-muted-foreground">不採用・辞退</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">
                {rejectedApps.length + withdrawnApps.length}
              </span>
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              選考ステップ
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {steps.filter((s) => s.step_type !== StepType.Offer).length + 1}
              </span>
            </h2>
            <Button variant="outline" size="xs" onClick={onEditSteps}>
              <Pencil className="size-3 mr-1" />
              編集
            </Button>
          </div>

          <div>
            {steps
              .filter((s) => s.step_type !== StepType.Offer)
              .map((step, index, arr) => (
                <div key={step.id}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {stepTypeLabels[step.step_type] ?? step.step_type}
                        {step.screening_type && (
                          <>
                            {" — "}
                            <span>
                              {screeningTypeLabels[step.screening_type] ?? step.screening_type}
                            </span>
                          </>
                        )}
                        {step.form_id && forms.find((f) => f.id === step.form_id) && (
                          <>
                            {" — "}
                            <span>{forms.find((f) => f.id === step.form_id)!.title}</span>
                          </>
                        )}
                        {step.interview_id &&
                          (() => {
                            const iv = interviews.find((i) => i.id === step.interview_id);
                            if (!iv) return null;
                            return (
                              <>
                                {" — "}
                                <span>{iv.title}</span>
                              </>
                            );
                          })()}
                      </p>
                    </div>
                  </div>
                  {index < arr.length - 1 && (
                    <div className="flex justify-start pl-7">
                      <div className="w-0.5 h-5 bg-primary/20" />
                    </div>
                  )}
                </div>
              ))}
            {steps.filter((s) => s.step_type !== StepType.Offer).length > 0 && (
              <div className="flex justify-start pl-7">
                <div className="w-0.5 h-5 bg-muted-foreground/20" />
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/60 border border-dashed">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 shrink-0">
                <span className="text-xs font-bold">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">内定</p>
                <p className="text-xs text-muted-foreground">すべてのステップ完了後に自動適用</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
