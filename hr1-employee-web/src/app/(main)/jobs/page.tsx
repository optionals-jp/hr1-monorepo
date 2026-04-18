"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { useJobsPage, useNewJobPage } from "@/features/recruiting/hooks/use-jobs-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import {
  jobStatusLabels as statusLabels,
  jobStatusColors as statusColors,
  stepTypeLabels,
  selectableStepTypes,
  screeningTypeLabels,
  StepType,
} from "@/lib/constants";
import { Trash2, GripVertical, Briefcase, XCircle, Plus } from "lucide-react";
import {
  StepCardShell,
  StepRow,
  StepTypeBadge,
} from "@/features/recruiting/components/selection-step-card";
import { EditPanel, type EditPanelTab } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormInput, FormTextarea, FormField } from "@hr1/shared-ui/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { ActionBar } from "@hr1/shared-ui/components/ui/action-bar";
import { SegmentControl } from "@hr1/shared-ui/components/ui/segment-control";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
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
import type { StepDraft } from "@/features/recruiting/hooks/use-jobs-page";

const createJobTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "steps", label: "選考ステップ" },
];

const pageTabs = [
  { value: "active", label: "公開中・ドラフト", icon: Briefcase },
  { value: "closed", label: "終了", icon: XCircle },
];

export default function JobsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    jobs,
    isLoading,
    jobsError,
    mutateJobs,
    appCounts,
    filtered,
  } = useJobsPage();
  const newJob = useNewJobPage();

  const onCreateSubmit = async () => {
    const result = await newJob.handleSubmit();
    if (result.success) {
      showToast("求人を作成しました");
      setDialogOpen(false);
      newJob.reset();
      mutateJobs();
    } else if (result.error && result.error !== "validation") {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={jobsError} onRetry={() => mutateJobs()} />
      <PageHeader
        title="求人管理"
        description="求人の作成・管理"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            求人を作成
          </Button>
        }
      />

      <StickyFilterBar>
        <TabBar
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as typeof activeTab)}
        />
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・部署・勤務地で検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>勤務地</TableHead>
              <TableHead>雇用形態</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">応募数</TableHead>
              <TableHead className="text-right">内定数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage={jobs.length === 0 ? "求人がありません" : "該当する求人がありません"}
            >
              {filtered.map((job) => {
                const counts = appCounts[job.id] ?? { total: 0, offered: 0 };
                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department ?? "-"}</TableCell>
                    <TableCell>{job.location ?? "-"}</TableCell>
                    <TableCell>{job.employment_type ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[job.status]}>{statusLabels[job.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.total > 0 ? (
                        <span className="font-medium">{counts.total}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.offered > 0 ? (
                        <span className="font-medium text-green-600">{counts.offered}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) newJob.reset();
        }}
        title="求人を作成"
        tabs={createJobTabs}
        activeTab={newJob.dialogTab}
        onTabChange={newJob.setDialogTab}
        onSave={onCreateSubmit}
        saving={newJob.saving}
        saveDisabled={!newJob.title.trim()}
        saveLabel="求人を作成"
      >
        {newJob.dialogTab === "basic" && (
          <div className="space-y-4">
            <FormInput
              label="タイトル"
              required
              value={newJob.title}
              onChange={(e) => newJob.setTitle(e.target.value)}
              placeholder="バックエンドエンジニア"
              error={newJob.formErrors.title}
            />

            <FormTextarea
              label="説明"
              value={newJob.description}
              onChange={(e) => newJob.setDescription(e.target.value)}
              placeholder="求人の説明を入力してください"
              rows={3}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="部署"
                value={newJob.department}
                onChange={(e) => newJob.setDepartment(e.target.value)}
                placeholder="エンジニアリング"
              />
              <FormInput
                label="勤務地"
                value={newJob.location}
                onChange={(e) => newJob.setLocation(e.target.value)}
                placeholder="東京"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="雇用形態"
                value={newJob.employmentType}
                onChange={(e) => newJob.setEmploymentType(e.target.value)}
                placeholder="正社員"
              />
              <FormInput
                label="年収レンジ"
                value={newJob.salaryRange}
                onChange={(e) => newJob.setSalaryRange(e.target.value)}
                placeholder="500万〜800万"
              />
            </div>

            <FormField label="ステータス">
              <Select value={newJob.status} onValueChange={(v) => v && newJob.setStatus(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => statusLabels[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">公開中</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="closed">終了</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}

        {newJob.dialogTab === "steps" && (
          <div className="space-y-4">
            {!newJob.title.trim() && (
              <ActionBar variant="error" title="基本情報タブでタイトルを入力してください" />
            )}
            {/* フローモード選択 */}
            <SegmentControl
              value={newJob.flowMode}
              onChange={newJob.setFlowMode}
              options={[
                { value: "select", label: "既存フローから選択" },
                { value: "create", label: "フローを新規作成" },
              ]}
            />

            {newJob.flowMode === "select" ? (
              <>
                {newJob.flowsWithTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    選考フローがありません。「フローを新規作成」から作成してください。
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">選考フロー</p>
                    <p className="text-xs text-muted-foreground">
                      求人に使用する選考フローを選択してください
                    </p>
                    <Select
                      value={newJob.selectedFlowId ?? ""}
                      onValueChange={(v) => {
                        if (v) newJob.addStepsFromFlow(v);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="フローを選択">
                          {(v: string) =>
                            newJob.flowsWithTemplates.find((f) => f.id === v)?.name ?? v
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {newJob.flowsWithTemplates.map((flow) => (
                          <SelectItem key={flow.id} value={flow.id}>
                            {flow.name}（{flow.templates.length}ステップ）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {newJob.selectedFlowId && newJob.steps.length > 0 && (
                  <div>
                    {newJob.steps.map((step, index) => (
                      <StepRow
                        key={step.tempId}
                        index={index}
                        isLast={index === newJob.steps.length - 1}
                      >
                        <StepCardShell>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold truncate flex-1 leading-snug">
                              {step.label}
                            </h3>
                            <StepTypeBadge stepType={step.step_type} />
                          </div>
                        </StepCardShell>
                      </StepRow>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <FormInput
                  label="フロー名"
                  value={newJob.newFlowName}
                  onChange={(e) => newJob.setNewFlowName(e.target.value)}
                  placeholder="例: FY27 新卒採用フロー（任意）"
                />
                <SortableStepList
                  steps={newJob.steps}
                  onReorder={newJob.reorderSteps}
                  onUpdate={newJob.updateStep}
                  onRemove={newJob.removeStep}
                />
                <Button variant="outline" size="sm" onClick={newJob.addStep}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  ステップを追加
                </Button>
              </>
            )}
          </div>
        )}
      </EditPanel>
    </div>
  );
}

// ---------- Sortable step list ----------

function SortableStepList({
  steps,
  onReorder,
  onUpdate,
  onRemove,
}: {
  steps: StepDraft[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  onUpdate: (
    tempId: string,
    field: "step_type" | "label" | "screeningType" | "requiresReview",
    value: string | boolean | null
  ) => void;
  onRemove: (tempId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.tempId === active.id);
    const newIndex = steps.findIndex((s) => s.tempId === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex);
  };

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-3">
        選考ステップを追加してください
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.tempId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <SortableStepRow
              key={step.tempId}
              step={step}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableStepRow({
  step,
  index,
  onUpdate,
  onRemove,
}: {
  step: StepDraft;
  index: number;
  onUpdate: (
    tempId: string,
    field: "step_type" | "label" | "screeningType" | "requiresReview",
    value: string | boolean | null
  ) => void;
  onRemove: (tempId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.tempId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 rounded-xl border bg-background p-2"
    >
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
        <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
        <Select
          value={step.step_type}
          onValueChange={(v) => v && onUpdate(step.tempId, "step_type", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(selectableStepTypes).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={step.label}
          onChange={(e) => onUpdate(step.tempId, "label", e.target.value)}
          placeholder="ステップ名"
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(step.tempId)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {step.step_type === StepType.Screening && (
        <div className="pl-12">
          <Select
            value={step.screeningType ?? ""}
            onValueChange={(v) => onUpdate(step.tempId, "screeningType", v || null)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="書類種別を選択">
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
        </div>
      )}
      {step.step_type !== StepType.Offer && (
        <div className="flex items-center gap-2 pl-12">
          <Switch
            checked={step.requiresReview}
            onCheckedChange={(v) => onUpdate(step.tempId, "requiresReview", v)}
          />
          <span className="text-xs text-muted-foreground">担当者確認</span>
        </div>
      )}
    </div>
  );
}
