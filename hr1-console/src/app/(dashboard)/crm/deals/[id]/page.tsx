"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCrmDealDetailPage } from "@/features/crm/hooks/use-crm-deal-detail-page";
import { DealInfoCard } from "@/features/crm/components/deal-info-card";
import { DealStageProgress } from "@/features/crm/components/deal-stage-progress";
import {
  ActivitiesTab,
  TodosTab,
  StageHistoryTab,
} from "@/features/crm/components/deal-detail-tabs";
import { DealEditPanel } from "@/features/crm/components/deal-edit-panel";
import { ActivityFormPanel } from "@/features/crm/components/activity-form-panel";
import { TodoFormPanel } from "@/features/crm/components/todo-form-panel";
import { Edit, Trash2 } from "lucide-react";
import type { DealDetailTab } from "@/features/crm/hooks/use-crm-deal-detail-page";

const detailTabs: { value: DealDetailTab; label: string }[] = [
  { value: "activities", label: "活動履歴" },
  { value: "todos", label: "TODO" },
  { value: "history", label: "ステージ履歴" },
];

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const h = useCrmDealDetailPage(id);

  const onUpdate = async () => {
    const r = await h.handleUpdate();
    if (r.success) showToast("商談を更新しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onDelete = async () => {
    const r = await h.handleDelete();
    if (r.success) {
      showToast("商談を削除しました");
      router.push("/crm/deals");
    } else if (r.error) showToast(r.error, "error");
  };
  const onAddActivity = async () => {
    const r = await h.handleAddActivity();
    if (r.success) showToast("活動を記録しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onAddTodo = async () => {
    const r = await h.handleAddTodo();
    if (r.success) showToast("TODOを追加しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onToggleTodo = async (todoId: string, completed: boolean) => {
    const r = await h.handleToggleTodo(todoId, completed);
    if (!r.success && r.error) showToast(r.error, "error");
  };

  if (!h.deal)
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );
  const deal = h.deal;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={deal.title}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "商談", href: "/crm/deals" },
          { label: deal.title, href: `/crm/deals/${id}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={h.openEdit}>
              <Edit className="size-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => h.setDeleteOpen(true)}>
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />
      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        <DealInfoCard
          deal={deal}
          onCompanyClick={() => router.push(`/crm/companies/${deal.company_id}`)}
        />
        {deal.status === "open" && h.stages.length > 0 && (
          <DealStageProgress
            stages={h.stages}
            currentStageId={deal.stage_id}
            currentStageIndex={h.currentStageIndex}
          />
        )}
        <div>
          <TabBar
            tabs={detailTabs}
            activeTab={h.activeTab}
            onTabChange={(v) => h.setActiveTab(v as DealDetailTab)}
          />
        </div>
        {h.activeTab === "activities" && (
          <ActivitiesTab
            activities={h.activities}
            getActivityIconType={h.getActivityIconType}
            onAddClick={() => h.setActivityOpen(true)}
          />
        )}
        {h.activeTab === "todos" && (
          <TodosTab
            todos={h.todos}
            onAddClick={() => h.setTodoOpen(true)}
            onToggle={onToggleTodo}
          />
        )}
        {h.activeTab === "history" && <StageHistoryTab stageHistory={h.stageHistory} />}
      </div>

      <DealEditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        onSave={onUpdate}
        editTitle={h.editTitle}
        setEditTitle={h.setEditTitle}
        editStatus={h.editStatus}
        setEditStatus={h.setEditStatus}
        editAmount={h.editAmount}
        setEditAmount={h.setEditAmount}
        editStageId={h.editStageId}
        setEditStageId={h.setEditStageId}
        editProbability={h.editProbability}
        setEditProbability={h.setEditProbability}
        editCloseDate={h.editCloseDate}
        setEditCloseDate={h.setEditCloseDate}
        editAssignedTo={h.editAssignedTo}
        setEditAssignedTo={h.setEditAssignedTo}
        editDescription={h.editDescription}
        setEditDescription={h.setEditDescription}
        stages={h.stages}
        employees={h.employees ?? []}
      />
      <ActivityFormPanel
        open={h.activityOpen}
        onOpenChange={h.setActivityOpen}
        onSave={onAddActivity}
        actType={h.actType}
        setActType={h.setActType}
        actTitle={h.actTitle}
        setActTitle={h.setActTitle}
        actDesc={h.actDesc}
        setActDesc={h.setActDesc}
        actDate={h.actDate}
        setActDate={h.setActDate}
      />
      <TodoFormPanel
        open={h.todoOpen}
        onOpenChange={h.setTodoOpen}
        onSave={onAddTodo}
        todoTitle={h.todoTitle}
        setTodoTitle={h.setTodoTitle}
        todoDesc={h.todoDesc}
        setTodoDesc={h.setTodoDesc}
        todoDueDate={h.todoDueDate}
        setTodoDueDate={h.setTodoDueDate}
        todoAssignee={h.todoAssignee}
        setTodoAssignee={h.setTodoAssignee}
        employees={h.employees ?? []}
      />
      <ConfirmDialog
        open={h.deleteOpen}
        onOpenChange={h.setDeleteOpen}
        title="商談を削除"
        description={`「${deal.title}」を削除しますか？この操作は元に戻せません。`}
        onConfirm={onDelete}
        confirmLabel="削除"
        variant="destructive"
      />
    </div>
  );
}
