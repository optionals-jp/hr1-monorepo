"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { ActionBar } from "@hr1/shared-ui/components/ui/action-bar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { applicationStatusLabels as statusLabels } from "@/lib/constants";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { useApplicationDetail } from "@/features/recruiting/hooks/use-application-detail";
import { ApplicationDashboardTab } from "@/features/recruiting/components/application-dashboard-tab";
import { ApplicationStepList } from "@/features/recruiting/components/application-step-list";
import { FormResponseSheet } from "@/features/recruiting/components/form-response-sheet";
import { ResourceSelectDialog } from "@/features/recruiting/components/resource-select-dialog";
import { OfferConditionsDialog } from "@/features/recruiting/components/offer-conditions-dialog";
import { OfferConditionsCard } from "@/features/recruiting/components/offer-conditions-card";
import { RejectionReasonDialog } from "@/features/recruiting/components/rejection-reason-dialog";
import { RejectionReasonCard } from "@/features/recruiting/components/rejection-reason-card";
import { InterviewStartDialog } from "@/features/recruiting/components/interview-start-dialog";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { applicationStatusColors as statusColors } from "@/lib/constants";
import { LayoutDashboard, ListChecks, ClipboardCheck, AlertCircle } from "lucide-react";
import { StepStatus, StepType, stepTypeLabels } from "@/lib/constants";
import type { ApplicationStep } from "@/types/database";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const detail = useApplicationDetail(id);

  const handleSkipStep = useCallback(
    async (step: ApplicationStep) => {
      const result = await detail.skipStep(step);
      if (!result.success) showToast(result.error!, "error");
    },
    [detail, showToast]
  );

  const handleUnskipStep = useCallback(
    async (step: ApplicationStep) => {
      const result = await detail.unskipStep(step);
      if (!result.success) showToast(result.error!, "error");
    },
    [detail, showToast]
  );

  if (detail.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!detail.application) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        応募が見つかりません
      </div>
    );
  }

  // applications.applicant_id は NOT NULL + FK なので profiles は常に join される。
  // 取得できていない場合はプロファイル削除などの異常系のため not-found 扱い。
  const profile = detail.application.profiles;
  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        応募者の情報が取得できませんでした
      </div>
    );
  }

  const tabs = [
    { value: "dashboard" as const, label: "ダッシュボード", icon: LayoutDashboard },
    { value: "steps" as const, label: "選考ステップ", icon: ListChecks },
    { value: "evaluation" as const, label: "評価", icon: ClipboardCheck },
  ];

  return (
    <>
      <PageHeader
        title={`${profile?.display_name ?? profile?.email ?? "不明"} の応募`}
        description={detail.application.jobs?.title ?? ""}
        breadcrumb={[{ label: "応募", href: "/applications" }]}
        sticky={false}
        action={
          detail.application.status === "offer_accepted" ||
          detail.application.status === "offer_declined" ? (
            <Badge variant={statusColors[detail.application.status]} className="text-sm px-3 py-1">
              {statusLabels[detail.application.status]}
            </Badge>
          ) : (
            <Select
              value={detail.application.status}
              onValueChange={detail.updateApplicationStatus}
            >
              <SelectTrigger className="w-32">
                <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">選考中</SelectItem>
                <SelectItem value="offered">内定</SelectItem>
                <SelectItem value="rejected">不採用</SelectItem>
                <SelectItem value="withdrawn">辞退</SelectItem>
              </SelectContent>
            </Select>
          )
        }
      />

      <ManagerActionBar
        steps={detail.steps}
        applicationStatus={detail.application.status}
        onAdvance={detail.advanceStep}
        onViewFormResponses={detail.openFormResponses}
        onOffer={() => detail.updateApplicationStatus("offered")}
        onReject={() => detail.updateApplicationStatus("rejected")}
      />

      <StickyFilterBar>
        <TabBar
          tabs={tabs}
          activeTab={detail.activeTab}
          onTabChange={(v) => detail.setActiveTab(v as (typeof tabs)[number]["value"])}
        />
      </StickyFilterBar>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {detail.activeTab === "dashboard" && (
          <div className="space-y-6">
            {detail.offer && (
              <div className="max-w-3xl">
                <OfferConditionsCard
                  offer={detail.offer}
                  applicationStatus={detail.application.status}
                />
              </div>
            )}
            {detail.application.status === "rejected" &&
              (detail.application.rejection_category || detail.application.rejection_reason) && (
                <div className="max-w-3xl">
                  <RejectionReasonCard
                    rejectionCategory={detail.application.rejection_category}
                    rejectionReason={detail.application.rejection_reason}
                  />
                </div>
              )}
            <ApplicationDashboardTab
              application={detail.application}
              profile={profile}
              steps={detail.steps}
              canActOnStep={detail.canActOnStep}
              advanceStep={detail.advanceStep}
              skipStep={handleSkipStep}
              unskipStep={handleUnskipStep}
              onViewFormResponses={detail.openFormResponses}
              onOffer={() => detail.updateApplicationStatus("offered")}
              onReject={() => detail.updateApplicationStatus("rejected")}
              source={detail.application.source}
              onSourceChange={detail.updateApplicationSource}
            />
          </div>
        )}

        {detail.activeTab === "evaluation" && (
          <EvaluationTab
            targetUserId={profile.id}
            targetType="applicant"
            applicationId={detail.application.id}
          />
        )}

        {detail.activeTab === "steps" && (
          <div className="space-y-6 max-w-3xl">
            <div className="rounded-lg bg-white border">
              <div className="px-5 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  選考ステップ
                  <span className="ml-1.5 text-xs font-normal">{detail.steps.length}</span>
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <ApplicationStepList
                  steps={detail.steps}
                  canActOnStep={detail.canActOnStep}
                  advanceStep={detail.advanceStep}
                  skipStep={handleSkipStep}
                  unskipStep={handleUnskipStep}
                  onViewFormResponses={detail.openFormResponses}
                  onOffer={() => detail.updateApplicationStatus("offered")}
                  onReject={() => detail.updateApplicationStatus("rejected")}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <FormResponseSheet
        open={detail.formSheetOpen}
        onOpenChange={detail.setFormSheetOpen}
        step={detail.formSheetStep}
        fields={detail.formSheetFields}
        loading={detail.formSheetLoading}
      />

      <InterviewStartDialog
        open={detail.interviewDialogOpen}
        onOpenChange={detail.setInterviewDialogOpen}
        step={detail.interviewDialogStep}
        onStart={detail.startInterviewStep}
        onGoToEvaluation={() => {
          detail.setInterviewDialogOpen(false);
          detail.setActiveTab("evaluation");
        }}
        saving={detail.interviewStarting}
      />

      <ResourceSelectDialog
        open={detail.resourceDialogOpen}
        onOpenChange={detail.setResourceDialogOpen}
        step={detail.resourceDialogStep}
        forms={detail.forms}
        interviews={detail.interviews}
        loading={detail.resourcesLoading}
        onSelect={detail.startStepWithResource}
      />

      <OfferConditionsDialog
        open={detail.offerDialogOpen}
        onOpenChange={detail.setOfferDialogOpen}
        onSubmit={detail.createOfferAndUpdateStatus}
      />

      <RejectionReasonDialog
        open={detail.rejectionDialogOpen}
        onOpenChange={detail.setRejectionDialogOpen}
        onSubmit={detail.rejectApplicationWithReason}
      />
    </>
  );
}

function ManagerActionBar({
  steps,
  applicationStatus,
  onAdvance,
  onViewFormResponses,
  onOffer,
  onReject,
}: {
  steps: ApplicationStep[];
  applicationStatus: string;
  onAdvance: (step: ApplicationStep) => void;
  onViewFormResponses: (step: ApplicationStep) => void;
  onOffer: () => void;
  onReject: () => void;
}) {
  if (applicationStatus === "rejected" || applicationStatus === "withdrawn") return null;
  if (applicationStatus === "offer_accepted" || applicationStatus === "offer_declined") return null;

  const inProgressStep = steps.find((s) => s.status === StepStatus.InProgress);
  const sortedPending = steps
    .filter((s) => s.status === StepStatus.Pending)
    .sort((a, b) => a.step_order - b.step_order);
  const allCompleted =
    steps.length > 0 &&
    steps.every((s) => s.status === StepStatus.Completed || s.status === StepStatus.Skipped);

  if (allCompleted) return null;

  // ケース1: in_progress のステップがあり、応募者のアクション待ち
  if (inProgressStep) {
    const isWaitingForApplicant =
      inProgressStep.applicant_action_at === null &&
      (inProgressStep.form_id != null ||
        inProgressStep.interview_id != null ||
        (inProgressStep.step_type === "screening" && inProgressStep.screening_type != null));

    if (isWaitingForApplicant) {
      return (
        <ActionBar
          variant="info"
          icon={<AlertCircle className="h-5 w-5" />}
          title="応募者の対応を待っています"
          description={`「${inProgressStep.label}」（${stepTypeLabels[inProgressStep.step_type] ?? inProgressStep.step_type}）で応募者のアクションが必要です`}
          className="mx-4 sm:mx-6 md:mx-8 mb-2"
        />
      );
    }

    // ケース2: 内定ステップ → 内定 / 不合格 ボタン
    if (inProgressStep.step_type === StepType.Offer) {
      return (
        <ActionBar
          icon={<AlertCircle className="h-5 w-5" />}
          title="採用判断が必要です"
          description={`「${inProgressStep.label}」— 内定または不合格を決定してください`}
          className="mx-4 sm:mx-6 md:mx-8 mb-2"
        >
          <Button variant="destructive" size="sm" onClick={onReject}>
            不合格
          </Button>
          <Button variant="default" size="sm" onClick={onOffer}>
            内定
          </Button>
        </ActionBar>
      );
    }

    // ケース3: レビュー待ち（応募者提出済み + requires_review）
    const isReviewPending =
      inProgressStep.applicant_action_at !== null && inProgressStep.requires_review;

    return (
      <ActionBar
        icon={<AlertCircle className="h-5 w-5" />}
        title={
          isReviewPending
            ? "応募者が提出済みです。内容を確認してください"
            : "採用担当者のアクションが必要です"
        }
        description={`「${inProgressStep.label}」（${stepTypeLabels[inProgressStep.step_type] ?? inProgressStep.step_type}）${isReviewPending ? "の提出内容を確認して完了にしてください" : "を確認して次に進めてください"}`}
        className="mx-4 sm:mx-6 md:mx-8 mb-2"
      >
        {isReviewPending && inProgressStep.form_id && (
          <Button variant="outline" size="sm" onClick={() => onViewFormResponses(inProgressStep)}>
            回答を確認
          </Button>
        )}
        {isReviewPending && inProgressStep.document_url && (
          <a
            href={inProgressStep.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            書類を確認
          </a>
        )}
        <Button variant="default" size="sm" onClick={() => onAdvance(inProgressStep)}>
          完了にする
        </Button>
      </ActionBar>
    );
  }

  // ケース3: in_progress がなく次の pending がある → 担当者が次のステップを開始
  const nextPending = sortedPending[0];
  if (nextPending) {
    return (
      <ActionBar
        icon={<AlertCircle className="h-5 w-5" />}
        title="採用担当者のアクションが必要です"
        description={`「${nextPending.label}」（${stepTypeLabels[nextPending.step_type] ?? nextPending.step_type}）を開始してください`}
        className="mx-4 sm:mx-6 md:mx-8 mb-2"
      >
        <Button variant="default" size="sm" onClick={() => onAdvance(nextPending)}>
          開始する
        </Button>
      </ActionBar>
    );
  }

  return null;
}
