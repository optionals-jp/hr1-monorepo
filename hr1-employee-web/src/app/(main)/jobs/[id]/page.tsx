"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { deleteJob } from "@/features/recruiting/hooks/use-jobs-page";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { jobStatusLabels as statusLabels } from "@/lib/constants";
import { FileText, Users, ScrollText } from "lucide-react";
import { useJobDetail } from "@/features/recruiting/hooks/use-job-detail";
import { JobApplicantsTab } from "@/features/recruiting/components/job-applicants-tab";
import { JobDetailTab } from "@/features/recruiting/components/job-detail-tab";
import { JobTimelineTab } from "@/features/recruiting/components/job-timeline-tab";
import { JobEditPanel } from "@/features/recruiting/components/job-edit-panel";
import { StepManageDialog } from "@/features/recruiting/components/step-manage-dialog";

const tabs = [
  { value: "detail", label: "概要", icon: FileText },
  { value: "applicants", label: "応募", icon: Users },
  { value: "timeline", label: "ログ", icon: ScrollText },
];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const { showToast } = useToast();
  const h = useJobDetail();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!organization || !h.job) return;
    setDeleting(true);
    const result = await deleteJob(organization.id, h.job.id);
    setDeleting(false);
    if (result.success) {
      showToast("求人を削除しました");
      router.push("/jobs");
    } else {
      showToast(result.error ?? "削除に失敗しました", "error");
    }
  };

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
          <div className="flex items-center gap-2">
            <Select value={h.job.status} onValueChange={(v) => v && h.updateJobStatus(v)}>
              <SelectTrigger className="w-32">
                <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">公開中</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="closed">終了</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              削除
            </Button>
          </div>
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

      {h.activeTab === "detail" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <JobDetailTab
            job={h.job}
            steps={h.steps}
            applications={h.applications}
            forms={h.forms}
            interviews={h.interviews}
            startEditingInfo={h.startEditingInfo}
            onEditSteps={() => h.setStepManageOpen(true)}
          />
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
        editClosingAt={h.editClosingAt}
        setEditClosingAt={h.setEditClosingAt}
        editApplicantLimit={h.editApplicantLimit}
        setEditApplicantLimit={h.setEditApplicantLimit}
        savingInfo={h.savingInfo}
        saveInfo={h.saveInfo}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="求人を削除"
        description={`「${h.job.title}」を削除します。この操作は取り消せません。`}
        confirmLabel={deleting ? "削除中..." : "削除"}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
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
