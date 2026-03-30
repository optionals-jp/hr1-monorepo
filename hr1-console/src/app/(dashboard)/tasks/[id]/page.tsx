"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";
import type { Task, TaskAssignee, Project, ProjectTeam } from "@/types/database";
import {
  loadTaskDetail,
  updateTaskById,
  deleteTaskById,
  updateAssigneeStatus,
  removeAssignee,
  addAssignees,
  fetchEmployeesForAssign,
  fetchProjectsForEdit,
  fetchTeamsForEdit,
  updateTaskStatus,
} from "@/lib/hooks/use-tasks";
import {
  taskStatusLabels,
  taskPriorityLabels,
  taskPriorityColors,
  taskScopeLabels,
  taskSourceLabels,
  taskAssigneeStatusLabels,
  taskAssigneeStatusColors,
} from "@/lib/constants";
import {
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  Users,
  FolderKanban,
  User,
  Globe,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

type TaskWithRelations = Task & {
  creator?: { display_name: string | null; email: string } | null;
  projects?: { id: string; name: string } | null;
  project_teams?: { id: string; name: string } | null;
};

type AssigneeRow = TaskAssignee & {
  profiles?: { display_name: string | null; email: string; position: string | null } | null;
};

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

const statusIcons: Record<string, React.ElementType> = {
  open: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: Ban,
};

const scopeIcons: Record<string, React.ElementType> = {
  personal: User,
  organization: Globe,
  project: FolderKanban,
  team: Users,
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [assignees, setAssignees] = useState<AssigneeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 編集パネル
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editScope, setEditScope] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 担当者追加パネル
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // プロジェクト・チーム一覧（編集用）
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<ProjectTeam[]>([]);

  const fetchTask = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const result = await loadTaskDetail(id, organization.id);
      if (!result.task) {
        router.push("/tasks");
        return;
      }
      setTask(result.task as TaskWithRelations);
      setAssignees((result.assignees ?? []) as AssigneeRow[]);
    } catch {
      showToast("タスクの取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [organization, id, router, showToast]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const openEditPanel = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ?? "");
    setEditScope(task.scope);
    setEditProjectId(task.project_id ?? "");
    setEditTeamId(task.team_id ?? "");
    setEditOpen(true);

    if (organization) {
      fetchProjectsForEdit(organization.id).then((data) => setProjects(data));
    }
  };

  const handleSaveEdit = async () => {
    if (!task || !editTitle.trim() || !organization) return;
    setSavingEdit(true);
    const result = await updateTaskById(task.id, organization.id, {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      dueDate: editDueDate,
      scope: editScope,
      projectId: editProjectId,
      teamId: editTeamId,
    });
    if (result.success) {
      setEditOpen(false);
      await fetchTask();
      showToast("タスクを更新しました");
    } else {
      showToast(result.error ?? "更新に失敗しました", "error");
    }
    setSavingEdit(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task || !organization) return;
    const result = await updateTaskStatus(task.id, organization.id, newStatus);
    if (result.success) {
      await fetchTask();
      showToast("ステータスを更新しました");
    } else {
      showToast(result.error ?? "更新に失敗しました", "error");
    }
  };

  const handleDelete = async () => {
    if (!task || !organization || !window.confirm("削除してもよろしいですか？")) return;
    const result = await deleteTaskById(task.id, organization.id);
    if (result.success) {
      showToast("タスクを削除しました");
      router.push("/tasks");
    } else {
      showToast(result.error ?? "削除に失敗しました", "error");
    }
  };

  const handleAssigneeStatusChange = async (assigneeId: string, newStatus: string) => {
    const result = await updateAssigneeStatus(assigneeId, newStatus);
    if (result.success) {
      await fetchTask();
      showToast("ステータスを更新しました");
    } else {
      showToast(result.error ?? "更新に失敗しました", "error");
    }
  };

  const handleRemoveAssignee = async (assigneeId: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    const result = await removeAssignee(assigneeId);
    if (result.success) {
      await fetchTask();
      showToast("担当者を削除しました");
    } else {
      showToast(result.error ?? "削除に失敗しました", "error");
    }
  };

  const openAssignDialog = async () => {
    if (!organization) return;
    const existingIds = new Set(assignees.map((a) => a.user_id));
    const emps = await fetchEmployeesForAssign(organization.id, existingIds);
    setAllEmployees(emps);
    setSelectedEmployeeIds([]);
    setAssignDialogOpen(true);
  };

  const handleAddAssignees = async () => {
    if (!task || selectedEmployeeIds.length === 0) return;
    setSavingAssign(true);
    const result = await addAssignees(task.id, selectedEmployeeIds);
    if (result.success) {
      setAssignDialogOpen(false);
      await fetchTask();
      showToast("担当者を追加しました");
    } else {
      showToast(result.error ?? "追加に失敗しました", "error");
    }
    setSavingAssign(false);
  };

  // チーム一覧取得（editScope=team時）
  useEffect(() => {
    if (editScope === "team" && editProjectId) {
      fetchTeamsForEdit(editProjectId).then((data) => setTeams(data));
    }
  }, [editScope, editProjectId]);

  if (loading || !task) {
    return (
      <>
        <PageHeader title="タスク詳細" breadcrumb={[{ label: "タスク", href: "/tasks" }]} />
        <div className="px-4 py-8 sm:px-6 md:px-8 text-center text-muted-foreground">
          {loading ? "読み込み中..." : "タスクが見つかりません"}
        </div>
      </>
    );
  }

  const StatusIcon = statusIcons[task.status] ?? Circle;
  const ScopeIcon = scopeIcons[task.scope] ?? Globe;
  const completedCount = assignees.filter((a) => a.status === "completed").length;

  return (
    <>
      <PageHeader
        title={task.title}
        breadcrumb={[{ label: "タスク", href: "/tasks" }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditPanel}>
              <Pencil className="h-4 w-4 mr-1.5" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 sm:px-6 md:px-8 space-y-6">
        {/* 基本情報カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">ステータス</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent transition-colors">
                    <StatusIcon
                      className={cn(
                        "h-4 w-4",
                        task.status === "completed" && "text-green-600",
                        task.status === "in_progress" && "text-blue-600",
                        task.status === "cancelled" && "text-muted-foreground",
                        task.status === "open" && "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">{taskStatusLabels[task.status]}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(taskStatusLabels).map(([k, v]) => (
                      <DropdownMenuItem
                        key={k}
                        onClick={() => handleStatusChange(k)}
                        className={cn(task.status === k && "font-medium")}
                      >
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">優先度</Label>
                <Badge variant={taskPriorityColors[task.priority]}>
                  {taskPriorityLabels[task.priority]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">期限</Label>
                <span className="text-sm">
                  {task.due_date ? format(new Date(task.due_date), "yyyy/MM/dd") : "未設定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">作成者</Label>
                <span className="text-sm">
                  {task.source === "console"
                    ? "管理者"
                    : (task.creator?.display_name ?? task.creator?.email)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">作成日</Label>
                <span className="text-sm">
                  {format(new Date(task.created_at), "yyyy/MM/dd HH:mm")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">共有・担当</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">共有範囲</Label>
                <div className="flex items-center gap-1.5 text-sm">
                  <ScopeIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {task.scope === "project" && task.projects?.name
                      ? task.projects.name
                      : task.scope === "team" && task.project_teams?.name
                        ? task.project_teams.name
                        : taskScopeLabels[task.scope]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">ソース</Label>
                <span className="text-sm">{taskSourceLabels[task.source]}</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">担当者数</Label>
                <span className="text-sm">
                  {assignees.length}名
                  {task.assign_to_all && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                      全員
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">進捗</Label>
                <span className="text-sm font-medium">
                  {completedCount}/{assignees.length} 完了
                </span>
              </div>
              {assignees.length > 0 && (
                <div className="pt-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${assignees.length > 0 ? (completedCount / assignees.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 説明 */}
        {task.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">説明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </CardContent>
          </Card>
        )}

        {/* 担当者一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">担当者一覧</h3>
            <Button variant="outline" size="sm" onClick={openAssignDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              担当者を追加
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>担当者</TableHead>
                  <TableHead>役職</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>完了日時</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={5}
                  isLoading={false}
                  isEmpty={assignees.length === 0}
                  emptyMessage="担当者が割り当てられていません"
                >
                  {assignees.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {(a.profiles?.display_name ?? a.profiles?.email ?? "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {a.profiles?.display_name ?? a.profiles?.email}
                            </p>
                            {a.profiles?.display_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {a.profiles.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.profiles?.position ?? "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center gap-1">
                            <Badge variant={taskAssigneeStatusColors[a.status]}>
                              {taskAssigneeStatusLabels[a.status]}
                            </Badge>
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {Object.entries(taskAssigneeStatusLabels).map(([k, v]) => (
                              <DropdownMenuItem
                                key={k}
                                onClick={() => handleAssigneeStatusChange(a.id, k)}
                                className={cn(a.status === k && "font-medium")}
                              >
                                {v}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.completed_at
                          ? format(new Date(a.completed_at), "yyyy/MM/dd HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAssignee(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="タスクを編集"
        saving={savingEdit}
        onSave={handleSaveEdit}
        saveDisabled={!editTitle.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タスク名 *</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>優先度</Label>
              <Select value={editPriority} onValueChange={(v) => v && setEditPriority(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => taskPriorityLabels[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskPriorityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>期限</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>共有範囲</Label>
            <div className="flex gap-1.5">
              {(
                [
                  { scope: "organization", label: "組織全体", icon: Globe },
                  { scope: "project", label: "プロジェクト", icon: FolderKanban },
                  { scope: "team", label: "チーム", icon: Users },
                ] as const
              ).map(({ scope, label, icon: Icon }) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setEditScope(scope);
                    if (scope !== "project" && scope !== "team") {
                      setEditProjectId("");
                      setEditTeamId("");
                    }
                    if (scope !== "team") setEditTeamId("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    editScope === scope
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(editScope === "project" || editScope === "team") && (
            <div className="space-y-2">
              <Label>プロジェクト</Label>
              <Select
                value={editProjectId}
                onValueChange={(v) => {
                  if (v) setEditProjectId(v);
                  setEditTeamId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プロジェクトを選択">
                    {(v: string) => projects.find((p) => p.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {editScope === "team" && editProjectId && (
            <div className="space-y-2">
              <Label>チーム</Label>
              <Select value={editTeamId} onValueChange={(v) => v && setEditTeamId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="チームを選択">
                    {(v: string) => teams.find((t) => t.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      チームがありません
                    </div>
                  ) : (
                    teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </EditPanel>

      {/* 担当者追加パネル */}
      <EditPanel
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        title="担当者を追加"
        saving={savingAssign}
        onSave={handleAddAssignees}
        saveDisabled={selectedEmployeeIds.length === 0}
        saveLabel="追加"
      >
        <div className="space-y-2">
          <Label>担当者を選択（{selectedEmployeeIds.length}名選択中）</Label>
          <div className="border rounded-lg max-h-72 overflow-y-auto">
            {allEmployees.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                追加可能な従業員がいません
              </div>
            ) : (
              allEmployees.map((e) => {
                const selected = selectedEmployeeIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() =>
                      setSelectedEmployeeIds((prev) =>
                        prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]
                      )
                    }
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                      selected ? "bg-primary/5" : "hover:bg-accent"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border text-xs shrink-0",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(e.display_name ?? e.email)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.display_name ?? e.email}</p>
                      {e.display_name && (
                        <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </EditPanel>
    </>
  );
}
