"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCrmDealDetailPage } from "@/features/crm/hooks/use-crm-deal-detail-page";
import { DealEditPanel } from "@/features/crm/components/deal-edit-panel";
import { ActivityFormPanel } from "@/features/crm/components/activity-form-panel";
import { TodoFormPanel } from "@/features/crm/components/todo-form-panel";
import { formatJpy } from "@/features/crm/rules";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import {
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  Building2,
  User,
  ChevronRight,
} from "lucide-react";
import type { DealDetailTab } from "@/features/crm/hooks/use-crm-deal-detail-page";

const activityIconMap: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  appointment: Calendar,
  visit: MapPin,
  memo: FileText,
};
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
        {/* Deal Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">ステータス</p>
                <Badge variant={dealStatusColors[deal.status] ?? "default"} className="mt-1">
                  {dealStatusLabels[deal.status] ?? deal.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">金額</p>
                <p className="text-lg font-semibold">
                  {deal.amount ? formatJpy(deal.amount) : "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">受注確度</p>
                <p className="text-lg font-semibold">
                  {deal.probability != null ? `${deal.probability}%` : "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">取引先企業</p>
                {deal.crm_companies ? (
                  <button
                    className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    onClick={() => router.push(`/crm/companies/${deal.company_id}`)}
                  >
                    <Building2 className="size-3.5" />
                    {deal.crm_companies.name}
                  </button>
                ) : (
                  <p className="text-sm mt-1">{"\u2014"}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">担当者</p>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <User className="size-3.5 text-muted-foreground" />
                  {deal.profiles?.display_name ?? "未割当"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">予定クローズ日</p>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {deal.expected_close_date ?? "\u2014"}
                </p>
              </div>
              {deal.description && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm text-muted-foreground">説明</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{deal.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stage Progress */}
        {deal.status === "open" && h.stages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">パイプラインステージ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {h.stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-1 flex-1">
                    <div
                      className={cn(
                        "h-2 rounded-full flex-1 transition-colors",
                        stage.id === deal.stage_id ||
                          (h.currentStageIndex >= 0 && i < h.currentStageIndex)
                          ? "opacity-100"
                          : "opacity-20"
                      )}
                      style={{ backgroundColor: stage.color }}
                    />
                    {i < h.stages.length - 1 && (
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {h.stages.map((stage) => (
                  <span
                    key={stage.id}
                    className={cn(
                      "text-xs flex-1 text-center",
                      stage.id === deal.stage_id
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {stage.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div>
          <TabBar
            tabs={detailTabs}
            activeTab={h.activeTab}
            onTabChange={(v) => h.setActiveTab(v as DealDetailTab)}
          />
        </div>

        {/* Activities */}
        {h.activeTab === "activities" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">活動履歴</h3>
              <Button size="sm" onClick={() => h.setActivityOpen(true)}>
                <Plus className="size-4 mr-1" />
                活動を記録
              </Button>
            </div>
            {!h.activities || h.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">活動履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {h.activities.map((act) => {
                  const Ic = activityIconMap[h.getActivityIconType(act.activity_type)] ?? FileText;
                  return (
                    <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                        <Ic className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{act.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {activityTypeLabels[act.activity_type] ?? act.activity_type}
                          </Badge>
                        </div>
                        {act.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {act.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>
                            {act.activity_date?.slice(0, 10) ?? act.created_at.slice(0, 10)}
                          </span>
                          {act.profiles && (
                            <span>{act.profiles.display_name ?? act.profiles.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Todos */}
        {h.activeTab === "todos" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">TODO</h3>
              <Button size="sm" onClick={() => h.setTodoOpen(true)}>
                <Plus className="size-4 mr-1" />
                TODOを追加
              </Button>
            </div>
            {!h.todos || h.todos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">TODOがありません</p>
            ) : (
              <div className="space-y-2">
                {h.todos.map((todo) => {
                  const overdue =
                    !todo.is_completed && todo.due_date && new Date(todo.due_date) < new Date();
                  return (
                    <div
                      key={todo.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        todo.is_completed && "opacity-60"
                      )}
                    >
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={() => onToggleTodo(todo.id, !todo.is_completed)}
                      >
                        {todo.is_completed ? (
                          <CheckCircle2 className="size-5 text-green-600" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn("text-sm font-medium", todo.is_completed && "line-through")}
                        >
                          {todo.title}
                        </p>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {todo.due_date && (
                            <span
                              className={cn(
                                "flex items-center gap-1",
                                overdue && "text-red-600 font-medium"
                              )}
                            >
                              <Clock className="size-3" />
                              {todo.due_date}
                              {overdue && " (期限超過)"}
                            </span>
                          )}
                          {todo.profiles && (
                            <span className="flex items-center gap-1">
                              <User className="size-3" />
                              {todo.profiles.display_name ?? todo.profiles.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {h.activeTab === "history" && (
          <div className="space-y-3">
            <h3 className="font-medium">ステージ履歴</h3>
            {!h.stageHistory || h.stageHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                ステージ変更履歴がありません
              </p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                {h.stageHistory.map((entry) => (
                  <div key={entry.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <ChevronRight className="size-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        {entry.from_stage_name && (
                          <>
                            <Badge variant="secondary">{entry.from_stage_name}</Badge>
                            <span className="text-muted-foreground">{"\u2192"}</span>
                          </>
                        )}
                        <Badge>{entry.to_stage_name}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{entry.changed_at.slice(0, 10)}</span>
                        {entry.profiles && (
                          <span>{entry.profiles.display_name ?? entry.profiles.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
