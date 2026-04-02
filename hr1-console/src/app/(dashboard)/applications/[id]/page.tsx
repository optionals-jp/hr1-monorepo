"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@/components/ui/toast";
import { applicationStatusLabels as statusLabels } from "@/lib/constants";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { useApplicationDetail } from "@/features/applications/hooks/use-application-detail";
import { ApplicationDashboardTab } from "@/features/applications/components/application-dashboard-tab";
import { ApplicationStepsTab } from "@/features/applications/components/application-steps-tab";
import { ApplicationLogTab } from "@/features/applications/components/application-log-tab";
import { FormResponseSheet } from "@/features/applications/components/form-response-sheet";
import { ResourceSelectDialog } from "@/features/applications/components/resource-select-dialog";
import { ConvertEmployeeDialog } from "@/features/applications/components/convert-employee-dialog";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import type { ApplicationProfile } from "@/features/applications/types";
import type { ApplicationStep } from "@/types/database";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
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

  const handleConvert = useCallback(async () => {
    const result = await detail.handleConvertToEmployee();
    if (result.success) {
      showToast("入社確定しました。応募者が社員として登録されました。");
    } else if (result.error) {
      showToast(`エラーが発生しました: ${result.error}`, "error");
    }
  }, [detail, showToast]);

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

  const profile = detail.application.profiles as unknown as ApplicationProfile;

  const tabs = [
    { value: "dashboard" as const, label: "ダッシュボード" },
    { value: "steps" as const, label: "選考ステップ", count: detail.steps.length },
    { value: "evaluation" as const, label: "評価" },
    { value: "history" as const, label: "選考ログ" },
    { value: "audit" as const, label: "変更ログ" },
  ];

  return (
    <>
      <PageHeader
        title={`${profile?.display_name ?? profile?.email ?? "不明"} の応募`}
        description={detail.application.jobs?.title ?? ""}
        breadcrumb={[{ label: "応募管理", href: "/applications" }]}
        sticky={false}
        action={
          <Select value={detail.application.status} onValueChange={detail.updateApplicationStatus}>
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
        }
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
          <ApplicationDashboardTab
            application={detail.application}
            profile={profile}
            steps={detail.steps}
            canActOnStep={detail.canActOnStep}
            advanceStep={detail.advanceStep}
            skipStep={handleSkipStep}
            unskipStep={handleUnskipStep}
            onViewFormResponses={detail.openFormResponses}
            onConvertDialogOpen={() => detail.setConvertDialogOpen(true)}
            evaluationCount={detail.evaluationCount}
            onOpenEvaluation={() => detail.setActiveTab("evaluation")}
          />
        )}

        {detail.activeTab === "steps" && (
          <ApplicationStepsTab
            steps={detail.steps}
            canActOnStep={detail.canActOnStep}
            advanceStep={detail.advanceStep}
            skipStep={handleSkipStep}
            unskipStep={handleUnskipStep}
            onViewFormResponses={detail.openFormResponses}
            evaluationCount={detail.evaluationCount}
            onOpenEvaluation={() => detail.setActiveTab("evaluation")}
          />
        )}

        {detail.activeTab === "evaluation" && (
          <EvaluationTab
            targetUserId={detail.application.applicant_id}
            targetType="applicant"
            applicationId={id}
          />
        )}

        {detail.activeTab === "history" && <ApplicationLogTab steps={detail.steps} />}

        {detail.activeTab === "audit" && organization && (
          <AuditLogPanel organizationId={organization.id} tableName="applications" recordId={id} />
        )}
      </div>

      <FormResponseSheet
        open={detail.formSheetOpen}
        onOpenChange={detail.setFormSheetOpen}
        step={detail.formSheetStep}
        fields={detail.formSheetFields}
        loading={detail.formSheetLoading}
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

      <ConvertEmployeeDialog
        open={detail.convertDialogOpen}
        onOpenChange={detail.setConvertDialogOpen}
        hireDate={detail.hireDate}
        onHireDateChange={detail.setHireDate}
        converting={detail.converting}
        onConvert={handleConvert}
      />
    </>
  );
}
