"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { jobStatusLabels as statusLabels, StepType } from "@/lib/constants";
import { useJobDetail } from "@/features/jobs/hooks/use-job-detail";
import { JobApplicantsTab } from "@/features/jobs/components/job-applicants-tab";
import { JobDetailTab } from "@/features/jobs/components/job-detail-tab";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { JobTimelineTab } from "@/features/jobs/components/job-timeline-tab";
import { JobEditPanel } from "@/features/jobs/components/job-edit-panel";
import { StepEditPanel } from "@/features/jobs/components/step-edit-panel";

const tabs = [
  { value: "detail", label: "求人詳細" },
  { value: "applicants", label: "応募者" },
  { value: "timeline", label: "ログ" },
  { value: "history", label: "編集ログ" },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const h = useJobDetail();
  const [auditLogCount, setAuditLogCount] = useState<number | undefined>(undefined);
  const handleAuditLoaded = useCallback((count: number) => setAuditLogCount(count), []);

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
        <TabBar
          tabs={tabs.map((tab) => ({
            ...tab,
            count:
              tab.value === "applicants"
                ? h.applications.length
                : tab.value === "timeline"
                  ? h.historyEvents.length
                  : tab.value === "history"
                    ? auditLogCount
                    : undefined,
          }))}
          activeTab={h.activeTab}
          onTabChange={h.setActiveTab}
        />
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
              forms={h.forms}
              interviews={h.interviews}
              reorderMode={h.reorderMode}
              setReorderMode={h.setReorderMode}
              dragIndex={h.dragIndex}
              setDragIndex={h.setDragIndex}
              dragOverIndex={h.dragOverIndex}
              setDragOverIndex={h.setDragOverIndex}
              confirmingReorder={h.confirmingReorder}
              confirmReorder={h.confirmReorder}
              reorderSteps={h.reorderSteps}
              stepsBeforeReorderRef={h.stepsBeforeReorder}
              setSteps={h.setSteps}
              startEditStep={h.startEditStep}
              startEditingInfo={h.startEditingInfo}
              openAddStep={() => {
                h.setNewStepType(StepType.Interview);
                h.setNewStepLabel("");
                h.setNewStepFormId("");
                h.setNewStepInterviewId("");
                h.setDialogOpen(true);
              }}
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

      {h.activeTab === "timeline" && (
        <JobTimelineTab
          historyEvents={h.historyEvents}
          historySearch={h.historySearch}
          setHistorySearch={h.setHistorySearch}
          statusFilter={h.statusFilter}
          setStatusFilter={h.setStatusFilter}
          eventFilter={h.eventFilter}
          setEventFilter={h.setEventFilter}
        />
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

      <StepEditPanel
        mode="edit"
        open={h.editStepOpen}
        onOpenChange={h.setEditStepOpen}
        stepType={h.editStepType}
        setStepType={h.setEditStepType}
        stepLabel={h.editStepLabel}
        setStepLabel={h.setEditStepLabel}
        stepFormId={h.editStepFormId}
        setStepFormId={h.setEditStepFormId}
        stepInterviewId={h.editStepInterviewId}
        setStepInterviewId={h.setEditStepInterviewId}
        forms={h.forms}
        interviews={h.interviews}
        saving={h.savingEditStep}
        onSave={h.saveEditStep}
        onDelete={h.deleteEditStep}
        deleting={h.deletingEditStep}
      />

      <StepEditPanel
        mode="add"
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        stepType={h.newStepType}
        setStepType={h.setNewStepType}
        stepLabel={h.newStepLabel}
        setStepLabel={h.setNewStepLabel}
        stepFormId={h.newStepFormId}
        setStepFormId={h.setNewStepFormId}
        stepInterviewId={h.newStepInterviewId}
        setStepInterviewId={h.setNewStepInterviewId}
        forms={h.forms}
        interviews={h.interviews}
        saving={h.savingStep}
        onSave={h.addStep}
      />
    </>
  );
}
