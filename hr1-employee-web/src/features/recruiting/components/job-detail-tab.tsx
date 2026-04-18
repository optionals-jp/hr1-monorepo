"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import type { Job, JobStep, Interview, Application } from "@/types/database";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Users, CheckCircle2, Clock, XCircle, Pencil } from "lucide-react";
import { formatYmdSlash } from "@/lib/datetime-utils";
import { StepType, screeningTypeLabels, jobStatusLabels as statusLabels } from "@/lib/constants";
import {
  StepCardShell,
  StepRow,
  StepTypeBadge,
} from "@/features/recruiting/components/selection-step-card";

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
            <span className="text-muted-foreground w-20 shrink-0">応募期限</span>
            <span>{job.closing_at ? formatYmdSlash(job.closing_at) : "締切なし"}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground w-20 shrink-0">募集人数</span>
            <span>
              {job.applicant_limit != null
                ? `${applications.length} / ${job.applicant_limit} 名`
                : `${applications.length} 名（上限なし）`}
            </span>
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
            <span>{formatYmdSlash(job.created_at)}</span>
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
            {(() => {
              const visibleSteps = steps.filter((s) => s.step_type !== StepType.Offer);
              const totalRows = visibleSteps.length + 1;
              return (
                <>
                  {visibleSteps.map((step, index) => {
                    const sub: string[] = [];
                    if (step.screening_type)
                      sub.push(screeningTypeLabels[step.screening_type] ?? step.screening_type);
                    const form = step.form_id ? forms.find((f) => f.id === step.form_id) : null;
                    if (form) sub.push(form.title);
                    const iv = step.interview_id
                      ? interviews.find((i) => i.id === step.interview_id)
                      : null;
                    if (iv) sub.push(iv.title);

                    return (
                      <StepRow key={step.id} index={index} isLast={false}>
                        <StepCardShell className="bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold truncate flex-1 leading-snug">
                              {step.label}
                            </h3>
                            <StepTypeBadge stepType={step.step_type} />
                          </div>
                          {sub.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">{sub.join(" / ")}</p>
                          )}
                        </StepCardShell>
                      </StepRow>
                    );
                  })}
                  <StepRow index={totalRows - 1} isLast status="completed">
                    <StepCardShell className="bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold truncate flex-1 leading-snug">内定</h3>
                        <StepTypeBadge stepType={StepType.Offer} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        すべてのステップ完了後に自動適用
                      </p>
                    </StepCardShell>
                  </StepRow>
                </>
              );
            })()}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
