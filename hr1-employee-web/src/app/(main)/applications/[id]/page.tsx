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
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { applicationStatusLabels as statusLabels } from "@/lib/constants";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { useApplicationDetail } from "@/features/recruiting/hooks/use-application-detail";
import { ApplicationDashboardTab } from "@/features/recruiting/components/application-dashboard-tab";
import { ApplicationStepList } from "@/features/recruiting/components/application-step-list";
import { FormResponseSheet } from "@/features/recruiting/components/form-response-sheet";
import { ResourceSelectDialog } from "@/features/recruiting/components/resource-select-dialog";
import { LayoutDashboard, ListChecks } from "lucide-react";
import type { ApplicationStep, Profile } from "@/types/database";

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

  const profile = detail.application.profiles as unknown as Profile;

  const tabs = [
    { value: "dashboard" as const, label: "ダッシュボード", icon: LayoutDashboard },
    { value: "steps" as const, label: "選考ステップ", icon: ListChecks },
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

      <ResourceSelectDialog
        open={detail.resourceDialogOpen}
        onOpenChange={detail.setResourceDialogOpen}
        step={detail.resourceDialogStep}
        forms={detail.forms}
        interviews={detail.interviews}
        loading={detail.resourcesLoading}
        onSelect={detail.startStepWithResource}
      />
    </>
  );
}
