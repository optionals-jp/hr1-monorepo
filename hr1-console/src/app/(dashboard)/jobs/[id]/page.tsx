"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { jobStatusLabels as statusLabels } from "@/lib/constants";
import { FileText, Users, ScrollText, FileClock } from "lucide-react";
import { useJobDetail } from "@/features/jobs/hooks/use-job-detail";
import { JobApplicantsTab } from "@/features/jobs/components/job-applicants-tab";
import { JobDetailTab } from "@/features/jobs/components/job-detail-tab";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { JobTimelineTab } from "@/features/jobs/components/job-timeline-tab";
import { JobEditPanel } from "@/features/jobs/components/job-edit-panel";
import { StepManageDialog } from "@/features/jobs/components/step-manage-dialog";

const tabs = [
  { value: "detail", label: "概要", icon: FileText },
  { value: "applicants", label: "応募者", icon: Users },
  { value: "timeline", label: "ログ", icon: ScrollText },
  { value: "history", label: "編集履歴", icon: FileClock },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const h = useJobDetail();
  const handleAuditLoaded = useCallback(() => {}, []);

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.job) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        求人が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={h.job.title}
        description={[h.job.department, h.job.location, h.job.employment_type]
          .filter(Boolean)
          .join(" / ")}
        breadcrumb={[{ label: "求人管理", href: "/jobs" }]}
        sticky={false}
        action={
          <Select value={h.job.status} onValueChange={(v) => v && h.updateJobStatus(v)}>
            <SelectTrigger className="w-32">
              <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">公開中</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="closed">終了</SelectItem>
              <SelectItem value="archived">アーカイブ</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
      </StickyFilterBar>

      {h.activeTab === "applicants" && (
        <JobApplicantsTab
          applications={h.applications}
          applicantSearch={h.applicantSearch}
          setApplicantSearch={h.setApplicantSearch}
          applicantStatusFilter={h.applicantStatusFilter}
          setApplicantStatusFilter={h.setApplicantStatusFilter}
        />
      )}

      {(h.activeTab === "detail" || h.activeTab === "history") && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          {h.activeTab === "detail" && (
            <JobDetailTab
              job={h.job}
              steps={h.steps}
              applications={h.applications}
              forms={h.forms}
              interviews={h.interviews}
              startEditingInfo={h.startEditingInfo}
              onEditSteps={() => h.setStepManageOpen(true)}
            />
          )}
          {h.activeTab === "history" && organization && (
            <AuditLogPanel
              organizationId={organization.id}
              tableName="jobs"
              recordId={id}
              refreshKey={h.auditRefreshKey}
              onLoaded={handleAuditLoaded}
            />
          )}
        </div>
      )}

      {h.activeTab === "timeline" && organization && (
        <JobTimelineTab jobId={id} organizationId={organization.id} />
      )}

      <JobEditPanel
        open={h.editingInfo}
        onOpenChange={h.setEditingInfo}
        editTab={h.editTab}
        setEditTab={h.setEditTab}
        editTitle={h.editTitle}
        setEditTitle={h.setEditTitle}
        editDescription={h.editDescription}
        setEditDescription={h.setEditDescription}
        editDepartment={h.editDepartment}
        setEditDepartment={h.setEditDepartment}
        editLocation={h.editLocation}
        setEditLocation={h.setEditLocation}
        editEmploymentType={h.editEmploymentType}
        setEditEmploymentType={h.setEditEmploymentType}
        editSalaryRange={h.editSalaryRange}
        setEditSalaryRange={h.setEditSalaryRange}
        savingInfo={h.savingInfo}
        saveInfo={h.saveInfo}
      />

      {h.stepManageOpen && (
        <StepManageDialog
          open={h.stepManageOpen}
          onOpenChange={h.setStepManageOpen}
          steps={h.steps}
          forms={h.forms}
          interviews={h.interviews}
          onSave={h.saveStepsManage}
          saving={h.savingStepManage}
        />
      )}
    </>
  );
}
