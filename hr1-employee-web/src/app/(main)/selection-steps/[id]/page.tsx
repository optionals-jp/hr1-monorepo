"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { MoreVertical, Pencil, Trash2, FileText, ListOrdered, Briefcase } from "lucide-react";
import { stepTypeLabels, StepType, jobStatusLabels, jobStatusColors } from "@/lib/constants";
import {
  useSelectionFlowDetail,
  type TemplateWithCounts,
  type RelatedJob,
} from "@/features/recruiting/hooks/use-selection-flow-detail";
import type { SelectionStepTemplate } from "@/types/database";

const BREADCRUMB = [{ label: "選考ステップ", href: "/selection-steps" }];

const tabs = [
  { value: "overview", label: "概要", icon: FileText },
  { value: "steps", label: "ステップ詳細", icon: ListOrdered },
  { value: "jobs", label: "求人", icon: Briefcase },
];

export default function SelectionFlowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const router = useRouter();
  const h = useSelectionFlowDetail(id);
  const [deleteStepTarget, setDeleteStepTarget] = useState<SelectionStepTemplate | null>(null);

  const onDeleteStepConfirm = async () => {
    if (!deleteStepTarget) return;
    const result = await h.handleStepDelete(deleteStepTarget.id);
    if (result.success) {
      showToast("選考ステップを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
    setDeleteStepTarget(null);
  };

  if (h.isLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader title="選考フロー" sticky={false} border={false} breadcrumb={BREADCRUMB} />
        <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (h.error || !h.flow) {
    return (
      <div className="flex flex-col">
        <PageHeader title="選考フロー" sticky={false} border={false} breadcrumb={BREADCRUMB} />
        {h.error && <QueryErrorBanner error={h.error} onRetry={() => h.mutateFlow()} />}
        <div className="py-12 text-center text-sm text-muted-foreground">
          フローが見つかりません。
          <Link href="/selection-steps" className="text-primary hover:underline ml-1">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <QueryErrorBanner
        error={h.error}
        onRetry={() => {
          h.mutateFlow();
          h.mutateTemplates();
        }}
      />
      <PageHeader
        title={h.flow.name}
        description={h.flow.description ?? undefined}
        sticky={false}
        border={false}
        breadcrumb={BREADCRUMB}
        action={
          h.activeTab === "steps" ? (
            <Button variant="primary" onClick={h.openAddStepDialog}>
              ステップを追加
            </Button>
          ) : undefined
        }
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
      </StickyFilterBar>

      {h.activeTab === "overview" && (
        <OverviewTab steps={h.steps} relatedJobs={h.relatedJobs} summary={h.summary} />
      )}

      {h.activeTab === "steps" && (
        <StepsTab
          steps={h.steps}
          onEdit={h.openEditStepDialog}
          onDelete={setDeleteStepTarget}
          deletingId={h.stepDeletingId}
        />
      )}

      {h.activeTab === "jobs" && <JobsTab jobs={h.relatedJobs} />}

      {/* ステップ追加/編集パネル */}
      <EditPanel
        open={h.stepDialogOpen}
        onOpenChange={h.setStepDialogOpen}
        title={h.stepForm.id ? "選考ステップを編集" : "選考ステップを追加"}
        onSave={async () => {
          const result = await h.handleStepSave();
          if (result.success) {
            showToast(h.stepForm.id ? "選考ステップを更新しました" : "選考ステップを追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.stepSaving}
        saveDisabled={!h.stepForm.name.trim()}
        saveLabel={h.stepForm.id ? "更新" : "追加"}
      >
        <div className="space-y-4">
          <FormInput
            label="ステップ名"
            required
            value={h.stepForm.name}
            onChange={(e) => h.setStepFormField("name", e.target.value)}
            placeholder="例: 1次面接"
            error={h.stepFormErrors.name}
          />
          <FormField label="種別" required>
            <Select
              value={h.stepForm.step_type}
              onValueChange={(v) => h.setStepFormField("step_type", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StepType.Screening}>書類選考</SelectItem>
                <SelectItem value={StepType.Form}>フォーム</SelectItem>
                <SelectItem value={StepType.Interview}>面接</SelectItem>
                <SelectItem value={StepType.ExternalTest}>外部テスト</SelectItem>
                <SelectItem value={StepType.Offer}>内定</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormTextarea
            label="説明"
            value={h.stepForm.description}
            onChange={(e) => h.setStepFormField("description", e.target.value)}
            placeholder="このステップの目的や運用メモ"
            rows={3}
          />
          <FormInput
            label="並び順"
            type="number"
            value={h.stepForm.sort_order}
            onChange={(e) => h.setStepFormField("sort_order", e.target.value)}
            placeholder="0"
          />
        </div>
      </EditPanel>

      {/* ステップ削除確認 */}
      <ConfirmDialog
        open={deleteStepTarget !== null}
        onOpenChange={(open) => !open && setDeleteStepTarget(null)}
        title="選考ステップの削除"
        description={
          deleteStepTarget
            ? `「${deleteStepTarget.name}」を削除します。この操作は取り消せません。`
            : ""
        }
        variant="destructive"
        confirmLabel="削除"
        onConfirm={onDeleteStepConfirm}
        loading={h.stepDeletingId !== null}
      />
    </div>
  );
}

// ---------- Overview Tab ----------

function OverviewTab({
  steps,
  relatedJobs,
  summary,
}: {
  steps: TemplateWithCounts[];
  relatedJobs: RelatedJob[];
  summary: { stepCount: number; jobCount: number; applicantCount: number };
}) {
  return (
    <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6 space-y-6">
      {/* サマリカード */}
      <div className="grid grid-cols-3 gap-4">
        <SectionCard>
          <p className="text-xs text-muted-foreground">ステップ数</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.stepCount}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-muted-foreground">関連求人</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.jobCount}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-muted-foreground">候補者数</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{summary.applicantCount}</p>
        </SectionCard>
      </div>

      {/* ステップごとの人数 */}
      <SectionCard>
        <h3 className="text-sm font-semibold mb-3">ステップ別の状況</h3>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">ステップがありません</p>
        ) : (
          <div className="divide-y divide-foreground/5">
            {steps.map((step) => {
              const total = step.totalCount;
              return (
                <div key={step.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stepTypeLabels[step.step_type] ?? step.step_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
                    <span className="text-muted-foreground">
                      未開始{" "}
                      <span className="font-semibold text-foreground">{step.pendingCount}</span>
                    </span>
                    <span className="text-muted-foreground">
                      進行中{" "}
                      <span className="font-semibold text-foreground">{step.inProgressCount}</span>
                    </span>
                    <span className="text-muted-foreground">
                      完了{" "}
                      <span className="font-semibold text-foreground">{step.completedCount}</span>
                    </span>
                    <Badge variant="outline" className="ml-1">
                      計 {total}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* 関連求人 */}
      <SectionCard>
        <h3 className="text-sm font-semibold mb-3">関連する求人</h3>
        {relatedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">関連する求人はありません</p>
        ) : (
          <div className="divide-y divide-foreground/5">
            {relatedJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[job.department, job.location].filter(Boolean).join(" / ") || "-"}
                  </p>
                </div>
                <Badge variant={jobStatusColors[job.status] ?? "outline"}>
                  {jobStatusLabels[job.status] ?? job.status}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {job.applicationCount}件応募
                </span>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------- Steps Tab ----------

function StepsTab({
  steps,
  onEdit,
  onDelete,
  deletingId,
}: {
  steps: TemplateWithCounts[];
  onEdit: (t: SelectionStepTemplate) => void;
  onDelete: (t: SelectionStepTemplate) => void;
  deletingId: string | null;
}) {
  return (
    <TableSection>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">順序</TableHead>
            <TableHead>ステップ名</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>説明</TableHead>
            <TableHead className="text-right">進行中</TableHead>
            <TableHead className="text-right">完了</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmptyState
            colSpan={7}
            isLoading={false}
            isEmpty={steps.length === 0}
            emptyMessage="ステップがまだありません。「ステップを追加」から作成してください"
          >
            {steps.map((step) => (
              <TableRow key={step.id} className="cursor-pointer" onClick={() => onEdit(step)}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {step.sort_order}
                </TableCell>
                <TableCell className="font-medium">{step.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {stepTypeLabels[step.step_type] ?? step.step_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                  {step.description ?? "-"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {step.inProgressCount}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {step.completedCount}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="操作メニュー" />}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(step)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(step)}
                        disabled={deletingId === step.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableEmptyState>
        </TableBody>
      </Table>
    </TableSection>
  );
}

// ---------- Jobs Tab ----------

function JobsTab({ jobs }: { jobs: RelatedJob[] }) {
  const router = useRouter();
  return (
    <TableSection>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>求人名</TableHead>
            <TableHead>部署 / 勤務地</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">応募数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmptyState
            colSpan={4}
            isLoading={false}
            isEmpty={jobs.length === 0}
            emptyMessage="このフローに関連する求人はありません"
          >
            {jobs.map((job) => (
              <TableRow
                key={job.id}
                className="cursor-pointer"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {[job.department, job.location].filter(Boolean).join(" / ") || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={jobStatusColors[job.status] ?? "outline"}>
                    {jobStatusLabels[job.status] ?? job.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{job.applicationCount}</TableCell>
              </TableRow>
            ))}
          </TableEmptyState>
        </TableBody>
      </Table>
    </TableSection>
  );
}
