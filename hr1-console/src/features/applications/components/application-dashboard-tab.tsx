"use client";

import Link from "next/link";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  applicationStatusLabels as statusLabels,
  stepStatusLabels,
  ApplicationStatus,
  StepStatus,
} from "@/lib/constants";
import type {
  Application,
  ApplicationStep,
  Profile,
  EvaluationScore,
  EvaluationCriterion,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ApplicationStepList } from "@/features/applications/components/application-steps-tab";
import { ProfileInfoList } from "@/components/ui/profile-info-list";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { UserCheck, ExternalLink, Star } from "lucide-react";

interface ApplicationDashboardTabProps {
  application: Application;
  profile: Profile;
  steps: ApplicationStep[];
  canActOnStep: (step: ApplicationStep) => boolean;
  advanceStep: (step: ApplicationStep) => void;
  skipStep: (step: ApplicationStep) => void;
  unskipStep: (step: ApplicationStep) => void;
  onViewFormResponses: (step: ApplicationStep) => void;
  onConvertDialogOpen: () => void;
  onOpenEvaluation?: () => void;
  evaluationCount: number;
  evaluationSummaries: {
    id: string;
    template_title: string;
    evaluator_name: string;
    status: string;
    submitted_at: string | null;
    created_at: string;
    scores: EvaluationScore[];
    criteria: EvaluationCriterion[];
  }[];
}

export function ApplicationDashboardTab({
  application,
  profile,
  steps,
  canActOnStep,
  advanceStep,
  skipStep,
  unskipStep,
  onViewFormResponses,
  onConvertDialogOpen,
  onOpenEvaluation,
  evaluationCount,
  evaluationSummaries,
}: ApplicationDashboardTabProps) {
  const completedSteps = steps.filter((s) => s.status === StepStatus.Completed).length;
  const currentStep = steps.find(
    (s) => s.status === StepStatus.InProgress || s.status === StepStatus.Pending
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 左カラム: プロフィール */}
      <SectionCard className="self-start">
        <div className="flex flex-col mb-6">
          <Avatar className="size-24 mb-3">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name ?? ""} />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-700 text-3xl font-semibold">
                {(profile?.display_name ?? profile?.email ?? "?")[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <h2 className="text-lg font-semibold">{profile?.display_name ?? "-"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email ?? "-"}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{statusLabels[application.status]}</Badge>
            {profile?.invited_at ? (
              <Badge variant="secondary">招待済み</Badge>
            ) : (
              <Badge variant="outline">未招待</Badge>
            )}
          </div>
          {profile?.id && (
            <Link href={`/applicants/${profile.id}`} className="mt-3">
              <Button variant="outline" size="xs">
                <ExternalLink className="size-3 mr-1" />
                応募者詳細
              </Button>
            </Link>
          )}
        </div>

        <ProfileInfoList profile={profile} />

        {/* 入社確定 */}
        {application?.status === ApplicationStatus.Offered && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <h4 className="text-sm font-semibold text-green-900">内定者を社員として登録</h4>
            <p className="text-xs text-green-700 mt-1 mb-3">
              この応募者を社員に変換し、社員アプリへのアクセスを許可します
            </p>
            <Button
              size="sm"
              onClick={onConvertDialogOpen}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="mr-1.5 h-4 w-4" />
              入社確定
            </Button>
          </div>
        )}
      </SectionCard>

      {/* 右カラム: 選考ステップ + 評価サマリー */}
      <div className="lg:col-span-2 space-y-6">
        {/* 選考進捗サマリー */}
        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">選考進捗</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: steps.length > 0 ? `${(completedSteps / steps.length) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              {completedSteps}/{steps.length}
            </span>
          </div>
          {currentStep && (
            <p className="text-sm text-muted-foreground mb-4">
              現在のステップ:{" "}
              <span className="font-medium text-foreground">{currentStep.label}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {stepStatusLabels[currentStep.status] ?? currentStep.status}
              </Badge>
            </p>
          )}
        </SectionCard>

        {/* 選考ステップ一覧 */}
        <SectionCard>
          <h2 className="text-sm font-semibold mb-3">
            選考ステップ
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{steps.length}</span>
          </h2>
          <ApplicationStepList
            steps={steps}
            canActOnStep={canActOnStep}
            advanceStep={advanceStep}
            skipStep={skipStep}
            unskipStep={unskipStep}
            onViewFormResponses={onViewFormResponses}
            onOpenEvaluation={onOpenEvaluation}
          />
        </SectionCard>

        {/* 評価サマリー */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">評価</h2>
            {evaluationCount > 0 && onOpenEvaluation && (
              <Button variant="outline" size="xs" onClick={onOpenEvaluation}>
                すべての評価を表示
              </Button>
            )}
          </div>
          {evaluationSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">評価がありません</p>
          ) : (
            <div className="space-y-3">
              {evaluationSummaries.map((ev) => (
                <div key={ev.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{ev.template_title}</span>
                    <Badge variant={ev.status === "submitted" ? "secondary" : "outline"}>
                      {ev.status === "submitted" ? "提出済み" : "下書き"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {ev.evaluator_name} ・{" "}
                    {format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                  </p>
                  <div className="space-y-2">
                    {ev.criteria.map((c) => {
                      const score = ev.scores.find((s) => s.criterion_id === c.id);
                      return (
                        <div key={c.id} className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground w-28 shrink-0 truncate">
                            {c.label}
                          </span>
                          <div className="flex-1">
                            {c.score_type === "five_star" && score?.score != null && (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      n <= score.score!
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-200"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                            {c.score_type === "ten_point" && score?.score != null && (
                              <span>{score.score}/10</span>
                            )}
                            {(c.score_type === "text" || c.score_type === "select") &&
                              score?.value && <span className="truncate">{score.value}</span>}
                            {!score && <span className="text-muted-foreground">-</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
