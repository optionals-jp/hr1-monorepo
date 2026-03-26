"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { applicationStatusLabels as statusLabels } from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { useApplicationDetail } from "@/features/applications/hooks/use-application-detail";
import { ApplicationDashboardTab } from "@/features/applications/components/application-dashboard-tab";
import { ApplicationStepsTab } from "@/features/applications/components/application-steps-tab";
import { ApplicationHistoryTab } from "@/features/applications/components/application-history-tab";
import { FormResponseSheet } from "@/features/applications/components/form-response-sheet";
import { ResourceSelectDialog } from "@/features/applications/components/resource-select-dialog";
import { ConvertEmployeeDialog } from "@/features/applications/components/convert-employee-dialog";
import type { ApplicationProfile } from "@/features/applications/types";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const detail = useApplicationDetail(id);

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
    { value: "history" as const, label: "選考履歴" },
    { value: "audit" as const, label: "変更履歴" },
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

      {/* タブナビゲーション（sticky） */}
      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => detail.setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                detail.activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
              )}
              {detail.activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {detail.activeTab === "dashboard" && (
          <ApplicationDashboardTab
            application={detail.application}
            profile={profile}
            steps={detail.steps}
            canActOnStep={detail.canActOnStep}
            advanceStep={detail.advanceStep}
            skipStep={detail.skipStep}
            unskipStep={detail.unskipStep}
            onViewFormResponses={detail.openFormResponses}
            onConvertDialogOpen={() => detail.setConvertDialogOpen(true)}
          />
        )}

        {detail.activeTab === "steps" && (
          <ApplicationStepsTab
            steps={detail.steps}
            canActOnStep={detail.canActOnStep}
            advanceStep={detail.advanceStep}
            skipStep={detail.skipStep}
            unskipStep={detail.unskipStep}
            onViewFormResponses={detail.openFormResponses}
          />
        )}

        {detail.activeTab === "history" && <ApplicationHistoryTab steps={detail.steps} />}

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
        onConvert={detail.handleConvertToEmployee}
      />
    </>
  );
}
