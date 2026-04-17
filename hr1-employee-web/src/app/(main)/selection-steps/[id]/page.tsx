"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { IconButton } from "@hr1/shared-ui/components/ui/icon-button";
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
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { MetaChip, MetaChipGroup } from "@hr1/shared-ui/components/ui/meta-chip";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
import { ActionBar } from "@hr1/shared-ui/components/ui/action-bar";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil,
  Plus,
  Trash2,
  FileText,
  ListOrdered,
  Briefcase,
  AlertCircle,
  GripVertical,
  FileSearch,
  ClipboardList,
  Users,
  Activity,
  Award,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  stepTypeLabels,
  StepType,
  jobStatusLabels,
  jobStatusColors,
  screeningTypeLabels,
} from "@/lib/constants";
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
      />

      {h.steps.length === 0 && (
        <ActionBar
          icon={<AlertCircle className="h-5 w-5" />}
          title="選考ステップがありません。ステップを追加してください。"
          className="mx-4 sm:mx-6 md:mx-8 mb-2"
        >
          <Button variant="default" size="sm" onClick={h.openAddStepDialog}>
            ステップを追加
          </Button>
        </ActionBar>
      )}

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
          onAdd={h.openAddStepDialog}
          onDelete={setDeleteStepTarget}
          onReorder={h.handleReorder}
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
          {h.stepForm.step_type === StepType.Screening && (
            <>
              <FormField label="選考方法" required>
                <Select
                  value={h.stepForm.screening_type ? "file" : "form"}
                  onValueChange={(v) => {
                    if (v === "form") {
                      h.setStepFormField("screening_type", null);
                    } else {
                      h.setStepFormField("form_id", null);
                      if (!h.stepForm.screening_type) {
                        h.setStepFormField("screening_type", "resume");
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) => (v === "form" ? "フォームから選考" : "ファイルアップロード")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="form">フォームから選考</SelectItem>
                    <SelectItem value="file">ファイルアップロード</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {!h.stepForm.screening_type ? (
                <FormField label="フォーム" required>
                  <Select
                    value={h.stepForm.form_id ?? ""}
                    onValueChange={(v) => h.setStepFormField("form_id", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="フォームを選択">
                        {(v: string) => h.forms.find((f) => f.id === v)?.title ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {h.forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : (
                <FormField label="書類種別" required>
                  <Select
                    value={h.stepForm.screening_type ?? ""}
                    onValueChange={(v) => h.setStepFormField("screening_type", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください">
                        {(v: string) => screeningTypeLabels[v] ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(screeningTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </>
          )}
          {h.stepForm.step_type !== StepType.Offer && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">担当者の確認が必要</p>
                <p className="text-xs text-muted-foreground">
                  ONの場合、応募者が提出後に担当者が確認して完了にします
                </p>
              </div>
              <Switch
                checked={h.stepForm.requires_review}
                onCheckedChange={(v) => h.setStepFormField("requires_review", v)}
              />
            </div>
          )}
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
      <div>
        <h3 className="text-sm font-semibold mb-3">関連する求人</h3>
        <RelatedJobsTable jobs={relatedJobs} />
      </div>
    </div>
  );
}

function RelatedJobsTable({ jobs }: { jobs: RelatedJob[] }) {
  const router = useRouter();
  return (
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
          emptyMessage="関連する求人はありません"
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
  );
}

// ---------- Steps Tab ----------

function StepsTab({
  steps,
  onEdit,
  onAdd,
  onDelete,
  onReorder,
  deletingId,
}: {
  steps: TemplateWithCounts[];
  onEdit: (t: SelectionStepTemplate) => void;
  onAdd: () => void;
  onDelete: (t: SelectionStepTemplate) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  deletingId: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (steps.length === 0) {
    return (
      <div className="px-4 py-12 sm:px-6 md:px-8 text-center text-sm text-muted-foreground">
        ステップがまだありません。
        <Button variant="link" className="px-1" onClick={onAdd}>
          ステップを追加
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <StepsEditMode
        steps={steps}
        onEdit={onEdit}
        onAdd={onAdd}
        onDelete={onDelete}
        onReorder={onReorder}
        onDone={() => setIsEditing(false)}
        deletingId={deletingId}
      />
    );
  }

  return (
    <div className="px-4 py-4 sm:px-6 md:px-8">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-muted-foreground">
          応募者がこのフローで通過する選考ステップの一覧です
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          ステップを編集
        </Button>
      </div>
      <div>
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

const stepTypeIcons: Record<string, LucideIcon> = {
  screening: FileSearch,
  form: ClipboardList,
  interview: Users,
  external_test: Activity,
  offer: Award,
};

function StepTypeIcon({ step, className }: { step: TemplateWithCounts; className?: string }) {
  const Icon = stepTypeIcons[step.step_type] ?? FileText;
  return <Icon className={className} />;
}

type MetaItem = { icon: LucideIcon; label: string };

function getStepMetaItems(step: TemplateWithCounts): MetaItem[] {
  const items: MetaItem[] = [];
  if (step.step_type === StepType.Screening) {
    if (step.form_id) {
      items.push({ icon: ClipboardList, label: step.formTitle ?? "フォーム未設定" });
    } else if (step.screening_type) {
      items.push({
        icon: FileText,
        label: screeningTypeLabels[step.screening_type] ?? step.screening_type,
      });
    }
  } else if (step.step_type === StepType.Form && step.form_id) {
    items.push({ icon: ClipboardList, label: step.formTitle ?? "フォーム未設定" });
  }
  if (step.step_type !== StepType.Offer) {
    items.push(
      step.requires_review
        ? { icon: UserCheck, label: "担当者確認あり" }
        : { icon: UserX, label: "担当者確認なし" }
    );
  }
  return items;
}

function StepMetaRow({ step }: { step: TemplateWithCounts }) {
  const items = getStepMetaItems(step);
  if (items.length === 0) return null;
  return (
    <MetaChipGroup className="mt-2.5">
      {items.map(({ icon, label }, i) => (
        <MetaChip key={i} icon={icon}>
          {label}
        </MetaChip>
      ))}
    </MetaChipGroup>
  );
}

function StepTypeBadge({ step }: { step: TemplateWithCounts }) {
  return (
    <Badge
      variant="outline"
      className="h-7 shrink-0 gap-1.5 px-3 text-sm font-medium [&>svg]:size-3.5!"
    >
      <StepTypeIcon step={step} className="text-muted-foreground" />
      {stepTypeLabels[step.step_type] ?? step.step_type}
    </Badge>
  );
}

function TimelineColumn({
  index,
  isLast,
  alignTop = true,
}: {
  index: number;
  isLast: boolean;
  alignTop?: boolean;
}) {
  return (
    <div className="flex flex-col items-center shrink-0 self-stretch">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold tabular-nums text-foreground ${
          alignTop ? "mt-3" : ""
        }`}
      >
        {index + 1}
      </div>
      {!isLast && <div className="w-px flex-1 bg-border mt-1.5" />}
    </div>
  );
}

function StepCard({
  step,
  index,
  isLast,
}: {
  step: TemplateWithCounts;
  index: number;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <TimelineColumn index={index} isLast={isLast} />
      <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-5"}`}>
        <div className="rounded-2xl sm:rounded-3xl bg-muted/40 p-4 sm:p-5 ring-1 ring-foreground/5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold truncate flex-1 leading-snug">{step.name}</h3>
            <StepTypeBadge step={step} />
          </div>
          <StepMetaRow step={step} />
          {step.description && (
            <p className="text-sm text-muted-foreground mt-2.5 line-clamp-2">{step.description}</p>
          )}
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground tabular-nums">
            <span>
              進行中 <span className="font-semibold text-foreground">{step.inProgressCount}</span>
            </span>
            <span>
              完了 <span className="font-semibold text-foreground">{step.completedCount}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Steps Edit Mode ----------

function StepsEditMode({
  steps,
  onEdit,
  onAdd,
  onDelete,
  onReorder,
  onDone,
  deletingId,
}: {
  steps: TemplateWithCounts[];
  onEdit: (t: SelectionStepTemplate) => void;
  onAdd: () => void;
  onDelete: (t: SelectionStepTemplate) => void;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onDone: () => void;
  deletingId: string | null;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex);
  };

  return (
    <div className="px-4 py-4 sm:px-6 md:px-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          ドラッグで並び替え、各ステップの編集・削除ができます
        </p>
        <Button variant="primary" size="sm" onClick={onDone}>
          完了
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div>
            {steps.map((step, index) => (
              <SortableStepCard
                key={step.id}
                step={step}
                index={index}
                isLast={false}
                onEdit={onEdit}
                onDelete={onDelete}
                deletingId={deletingId}
              />
            ))}
            <AddStepRow index={steps.length} onAdd={onAdd} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function AddStepRow({ index, onAdd }: { index: number; onAdd: () => void }) {
  return (
    <div className="flex gap-3">
      {/* spacer for drag handle column */}
      <div className="w-4 shrink-0" />
      <div className="flex flex-col items-center shrink-0 self-stretch">
        <button
          type="button"
          onClick={onAdd}
          aria-label="ステップを追加"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-background text-muted-foreground mt-3 transition-colors hover:border-foreground/30 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">{index + 1}</span>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center gap-2 rounded-2xl sm:rounded-3xl border border-dashed border-border bg-background/40 p-4 sm:p-5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          ステップを追加
        </button>
      </div>
    </div>
  );
}

function SortableStepCard({
  step,
  index,
  isLast,
  onEdit,
  onDelete,
  deletingId,
}: {
  step: TemplateWithCounts;
  index: number;
  isLast: boolean;
  onEdit: (t: SelectionStepTemplate) => void;
  onDelete: (t: SelectionStepTemplate) => void;
  deletingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3">
      <button
        type="button"
        className="flex h-8 shrink-0 items-center cursor-grab touch-none mt-3"
        {...attributes}
        {...listeners}
        aria-label="ドラッグして並び替え"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <TimelineColumn index={index} isLast={isLast} />
      <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-5"}`}>
        <div className="flex items-start gap-2 rounded-2xl sm:rounded-3xl bg-muted/40 p-4 sm:p-5 ring-1 ring-foreground/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold truncate flex-1 leading-snug">{step.name}</h3>
              <StepTypeBadge step={step} />
            </div>
            <StepMetaRow step={step} />
            {step.description && (
              <p className="text-sm text-muted-foreground mt-2.5 line-clamp-2">
                {step.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton onClick={() => onEdit(step)} aria-label="編集">
              <Pencil />
            </IconButton>
            <IconButton
              variant="destructive"
              onClick={() => onDelete(step)}
              disabled={deletingId === step.id}
              aria-label="削除"
            >
              <Trash2 />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
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
