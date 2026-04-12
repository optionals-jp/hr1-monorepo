"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { useEmployees } from "@/lib/hooks/use-org-query";
import {
  fetchDeal,
  updateDeal,
  deleteDeal,
  fetchActivitiesByDeal,
  fetchTodosByDeal,
  createActivity,
  createTodo,
  toggleTodoComplete,
  fetchStageHistory,
} from "@/lib/repositories/crm-repository";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import type { BcDeal, BcActivity, BcTodo, CrmDealStageHistory } from "@/types/database";
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
import { cn } from "@/lib/utils";

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: pipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(pipeline);
  const { data: employees } = useEmployees();

  const { data: deal, mutate: mutateDeal } = useOrgQuery<BcDeal | null>(`crm-deal-${id}`, (orgId) =>
    fetchDeal(getSupabase(), id, orgId)
  );

  const { data: activities, mutate: mutateActivities } = useOrgQuery<BcActivity[]>(
    `crm-deal-activities-${id}`,
    (orgId) => fetchActivitiesByDeal(getSupabase(), id, orgId)
  );

  const { data: todos, mutate: mutateTodos } = useOrgQuery<BcTodo[]>(
    `crm-deal-todos-${id}`,
    (orgId) => fetchTodosByDeal(getSupabase(), id, orgId)
  );

  const { data: stageHistory } = useOrgQuery<CrmDealStageHistory[]>(
    `crm-deal-stage-history-${id}`,
    (orgId) => fetchStageHistory(getSupabase(), orgId, id)
  );

  // Edit deal state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editStageId, setEditStageId] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Add activity state
  const [activityOpen, setActivityOpen] = useState(false);
  const [actType, setActType] = useState("memo");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));

  // Add todo state
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDesc, setTodoDesc] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [todoAssignee, setTodoAssignee] = useState("");

  // Active section tab
  const [activeTab, setActiveTab] = useState<"activities" | "todos" | "history">("activities");

  const openEdit = () => {
    if (!deal) return;
    setEditTitle(deal.title);
    setEditAmount(deal.amount?.toString() ?? "");
    setEditStageId(deal.stage_id ?? "");
    setEditProbability(deal.probability?.toString() ?? "");
    setEditCloseDate(deal.expected_close_date ?? "");
    setEditAssignedTo(deal.assigned_to ?? "");
    setEditDescription(deal.description ?? "");
    setEditStatus(deal.status);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!organization || !deal) return;
    if (!editTitle.trim()) {
      showToast("商談名は必須です", "error");
      return;
    }
    try {
      await updateDeal(getSupabase(), id, organization.id, {
        title: editTitle,
        amount: editAmount ? Number(editAmount) : null,
        stage_id: editStageId || null,
        probability: editProbability ? Number(editProbability) : null,
        expected_close_date: editCloseDate || null,
        assigned_to: editAssignedTo || null,
        description: editDescription || null,
        status: editStatus as BcDeal["status"],
      });
      setEditOpen(false);
      mutateDeal();
      showToast("商談を更新しました");
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    try {
      await deleteDeal(getSupabase(), id, organization.id);
      showToast("商談を削除しました");
      router.push("/crm/deals");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  const handleAddActivity = async () => {
    if (!organization || !actTitle.trim()) return;
    try {
      await createActivity(getSupabase(), {
        organization_id: organization.id,
        deal_id: id,
        company_id: deal?.company_id ?? null,
        contact_id: deal?.contact_id ?? null,
        activity_type: actType,
        title: actTitle,
        description: actDesc || null,
        activity_date: actDate,
        created_by: user?.id ?? null,
      });
      setActivityOpen(false);
      setActTitle("");
      setActDesc("");
      setActType("memo");
      mutateActivities();
      showToast("活動を記録しました");
    } catch {
      showToast("活動の記録に失敗しました", "error");
    }
  };

  const handleAddTodo = async () => {
    if (!organization || !todoTitle.trim()) return;
    try {
      await createTodo(getSupabase(), {
        organization_id: organization.id,
        deal_id: id,
        company_id: deal?.company_id ?? null,
        contact_id: deal?.contact_id ?? null,
        title: todoTitle,
        description: todoDesc || null,
        due_date: todoDueDate || null,
        assigned_to: todoAssignee || user?.id || null,
        created_by: user?.id ?? null,
      });
      setTodoOpen(false);
      setTodoTitle("");
      setTodoDesc("");
      setTodoDueDate("");
      setTodoAssignee("");
      mutateTodos();
      showToast("TODOを追加しました");
    } catch {
      showToast("TODOの追加に失敗しました", "error");
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    if (!organization) return;
    try {
      await toggleTodoComplete(getSupabase(), todoId, organization.id, completed);
      mutateTodos();
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="size-4" />;
      case "email":
        return <Mail className="size-4" />;
      case "appointment":
        return <Calendar className="size-4" />;
      case "visit":
        return <MapPin className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  if (!deal) {
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );
  }

  const currentStageIndex = stages.findIndex((s) => s.id === deal.stage_id);

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
            <Button variant="outline" onClick={openEdit}>
              <Edit className="size-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      {/* Deal Info */}
      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
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
                  {deal.amount ? formatJpy(deal.amount) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">受注確度</p>
                <p className="text-lg font-semibold">
                  {deal.probability != null ? `${deal.probability}%` : "—"}
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
                  <p className="text-sm mt-1">—</p>
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
                  {deal.expected_close_date ?? "—"}
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

        {/* Stage Progress Bar */}
        {deal.status === "open" && stages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">パイプラインステージ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {stages.map((stage, i) => {
                  const isCurrent = stage.id === deal.stage_id;
                  const isPast = currentStageIndex >= 0 && i < currentStageIndex;
                  return (
                    <div key={stage.id} className="flex items-center gap-1 flex-1">
                      <div
                        className={cn(
                          "h-2 rounded-full flex-1 transition-colors",
                          isCurrent || isPast ? "opacity-100" : "opacity-20"
                        )}
                        style={{ backgroundColor: stage.color }}
                      />
                      {i < stages.length - 1 && (
                        <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                {stages.map((stage) => (
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

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b">
          {(
            [
              { key: "activities", label: "活動履歴", count: activities?.length },
              { key: "todos", label: "TODO", count: todos?.filter((t) => !t.is_completed).length },
              { key: "history", label: "ステージ履歴", count: stageHistory?.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">活動履歴</h3>
              <Button size="sm" onClick={() => setActivityOpen(true)}>
                <Plus className="size-4 mr-1" />
                活動を記録
              </Button>
            </div>
            {!activities || activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">活動履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                      {activityIcon(act.activity_type)}
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Todos Tab */}
        {activeTab === "todos" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">TODO</h3>
              <Button size="sm" onClick={() => setTodoOpen(true)}>
                <Plus className="size-4 mr-1" />
                TODOを追加
              </Button>
            </div>
            {!todos || todos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">TODOがありません</p>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => {
                  const isOverdue =
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
                        onClick={() => handleToggleTodo(todo.id, !todo.is_completed)}
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
                                isOverdue && "text-red-600 font-medium"
                              )}
                            >
                              <Clock className="size-3" />
                              {todo.due_date}
                              {isOverdue && " (期限超過)"}
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

        {/* Stage History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <h3 className="font-medium">ステージ履歴</h3>
            {!stageHistory || stageHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                ステージ変更履歴がありません
              </p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                {stageHistory.map((entry) => (
                  <div key={entry.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <ChevronRight className="size-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        {entry.from_stage_name && (
                          <>
                            <Badge variant="secondary">{entry.from_stage_name}</Badge>
                            <span className="text-muted-foreground">→</span>
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

      {/* Edit Deal Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="商談を編集"
        onSave={handleUpdate}
        saveLabel="更新"
      >
        <div className="space-y-4">
          <div>
            <Label>商談名 *</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <Label>ステータス</Label>
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">商談中</SelectItem>
                <SelectItem value="won">受注</SelectItem>
                <SelectItem value="lost">失注</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>金額</Label>
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>ステージ</Label>
            <Select value={editStageId} onValueChange={(v) => setEditStageId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="ステージを選択" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>確度 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={editProbability}
              onChange={(e) => setEditProbability(e.target.value)}
            />
          </div>
          <div>
            <Label>予定クローズ日</Label>
            <Input
              type="date"
              value={editCloseDate}
              onChange={(e) => setEditCloseDate(e.target.value)}
            />
          </div>
          <div>
            <Label>担当</Label>
            <Select value={editAssignedTo} onValueChange={(v) => setEditAssignedTo(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="担当を選択" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.display_name ?? emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>

      {/* Add Activity Panel */}
      <EditPanel
        open={activityOpen}
        onOpenChange={setActivityOpen}
        title="活動を記録"
        onSave={handleAddActivity}
        saveLabel="記録"
        saveDisabled={!actTitle.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>種別</Label>
            <Select value={actType} onValueChange={(v) => setActType(v ?? "memo")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>タイトル *</Label>
            <Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} />
          </div>
          <div>
            <Label>日付</Label>
            <Input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>

      {/* Add Todo Panel */}
      <EditPanel
        open={todoOpen}
        onOpenChange={setTodoOpen}
        title="TODOを追加"
        onSave={handleAddTodo}
        saveLabel="追加"
        saveDisabled={!todoTitle.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>タイトル *</Label>
            <Input value={todoTitle} onChange={(e) => setTodoTitle(e.target.value)} />
          </div>
          <div>
            <Label>期限</Label>
            <Input
              type="date"
              value={todoDueDate}
              onChange={(e) => setTodoDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>担当</Label>
            <Select value={todoAssignee} onValueChange={(v) => setTodoAssignee(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="担当を選択" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.display_name ?? emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>説明</Label>
            <Textarea value={todoDesc} onChange={(e) => setTodoDesc(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="商談を削除"
        description={`「${deal.title}」を削除しますか？この操作は元に戻せません。`}
        onConfirm={handleDelete}
        confirmLabel="削除"
        variant="destructive"
      />
    </div>
  );
}
