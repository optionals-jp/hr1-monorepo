"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useRouter } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  useTasks,
  useTaskEmployees,
  useTaskProjects,
  useTaskTeams,
  createTask,
  updateTaskStatus,
} from "@/lib/hooks/use-tasks";
import {
  taskStatusLabels,
  taskPriorityLabels,
  taskPriorityColors,
  taskScopeLabels,
  taskSourceLabels,
} from "@/lib/constants";
import {
  SlidersHorizontal,
  X,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  Users,
  FolderKanban,
  User,
  Globe,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "assign", label: "担当者" },
];

const statusIcons: Record<string, React.ElementType> = {
  open: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: Ban,
};

export default function TasksPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [saving, setSaving] = useState(false);

  // 新規作成フォーム
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newScope, setNewScope] = useState<string>("organization");
  const [newProjectId, setNewProjectId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignAll, setNewAssignAll] = useState(true);
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);

  // データ取得
  const { data: tasks = [], isLoading, error: tasksError, mutate } = useTasks();

  const { data: employees = [] } = useTaskEmployees();

  const { data: projects = [] } = useTaskProjects();

  const { data: teams = [] } = useTaskTeams(newProjectId, newScope);

  // フィルター
  const filtered = useMemo(() => {
    let rows = tasks;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      rows = rows.filter((t) => t.status === filterStatus);
    }
    if (filterSource !== "all") {
      rows = rows.filter((t) => t.source === filterSource);
    }
    if (filterPriority !== "all") {
      rows = rows.filter((t) => t.priority === filterPriority);
    }
    return rows;
  }, [tasks, search, filterStatus, filterSource, filterPriority]);

  const openAddDialog = () => {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewScope("organization");
    setNewProjectId("");
    setNewTeamId("");
    setNewDueDate("");
    setNewAssignAll(true);
    setNewAssigneeIds([]);
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !user || !newTitle.trim()) return;
    setSaving(true);

    const result = await createTask(
      organization.id,
      user.id,
      {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        scope: newScope,
        projectId: newProjectId,
        teamId: newTeamId,
        dueDate: newDueDate,
        assignAll: newAssignAll,
        assigneeIds: newAssigneeIds,
      },
      employees
    );

    if (result.success) {
      setDialogOpen(false);
      mutate();
      showToast("タスクを作成しました");
    } else {
      showToast(result.error ?? "タスクの作成に失敗しました", "error");
    }
    setSaving(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!organization) return;
    const result = await updateTaskStatus(taskId, organization.id, newStatus);
    if (result.success) {
      mutate();
      showToast("ステータスを更新しました");
    } else {
      showToast(result.error ?? "更新に失敗しました", "error");
    }
  };

  const toggleAssignee = (id: string) => {
    setNewAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const activeFilters = [
    filterStatus !== "all"
      ? {
          key: "status",
          label: `ステータス：${taskStatusLabels[filterStatus]}`,
          clear: () => setFilterStatus("all"),
        }
      : null,
    filterSource !== "all"
      ? {
          key: "source",
          label: `作成者：${taskSourceLabels[filterSource]}`,
          clear: () => setFilterSource("all"),
        }
      : null,
    filterPriority !== "all"
      ? {
          key: "priority",
          label: `優先度：${taskPriorityLabels[filterPriority]}`,
          clear: () => setFilterPriority("all"),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={tasksError} onRetry={() => mutate()} />
      <PageHeader
        title="タスク一覧"
        description="従業員へのタスク依頼・共有タスクの管理"
        sticky={false}
        border={false}
        action={<Button onClick={openAddDialog}>タスクを作成</Button>}
      />

      <div className="sticky top-14 z-10">
        <SearchBar value={search} onChange={setSearch} placeholder="タスク名・説明で検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {activeFilters.map((f) => (
                  <Badge
                    key={f.key}
                    variant="secondary"
                    className="shrink-0 gap-1 text-sm py-3 px-3"
                  >
                    {f.label}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        f.clear();
                      }}
                      className="ml-0.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              ステータス
            </div>
            <DropdownMenuItem className="py-2" onClick={() => setFilterStatus("all")}>
              <span className={cn(filterStatus === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(taskStatusLabels).map(([k, v]) => (
              <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterStatus(k)}>
                <span className={cn(filterStatus === k && "font-medium")}>{v}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">作成者</div>
            <DropdownMenuItem className="py-2" onClick={() => setFilterSource("all")}>
              <span className={cn(filterSource === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(taskSourceLabels).map(([k, v]) => (
              <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterSource(k)}>
                <span className={cn(filterSource === k && "font-medium")}>{v}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">優先度</div>
            <DropdownMenuItem className="py-2" onClick={() => setFilterPriority("all")}>
              <span className={cn(filterPriority === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(taskPriorityLabels).map(([k, v]) => (
              <DropdownMenuItem className="py-2" key={k} onClick={() => setFilterPriority(k)}>
                <span className={cn(filterPriority === k && "font-medium")}>{v}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>タスク</TableHead>
              <TableHead>優先度</TableHead>
              <TableHead>スコープ</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>期限</TableHead>
              <TableHead>作成者</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage="タスクがありません"
            >
              {filtered.map((task) => {
                const StatusIcon = statusIcons[task.status] ?? Circle;
                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded hover:bg-accent transition-colors">
                          <StatusIcon
                            className={cn(
                              "h-5 w-5",
                              task.status === "completed" && "text-green-600",
                              task.status === "in_progress" && "text-blue-600",
                              task.status === "cancelled" && "text-muted-foreground",
                              task.status === "open" && "text-muted-foreground"
                            )}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {Object.entries(taskStatusLabels).map(([k, v]) => (
                            <DropdownMenuItem
                              key={k}
                              onClick={() => handleStatusChange(task.id, k)}
                              className={cn(task.status === k && "font-medium")}
                            >
                              {v}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span
                          className={cn(
                            "font-medium",
                            task.status === "completed" && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={taskPriorityColors[task.priority]}>
                        {taskPriorityLabels[task.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {task.scope === "personal" && <User className="h-3.5 w-3.5" />}
                        {task.scope === "organization" && <Globe className="h-3.5 w-3.5" />}
                        {task.scope === "project" && <FolderKanban className="h-3.5 w-3.5" />}
                        {task.scope === "team" && <Users className="h-3.5 w-3.5" />}
                        <span>
                          {task.scope === "project" && task.projects?.name
                            ? task.projects.name
                            : task.scope === "team" && task.project_teams?.name
                              ? task.project_teams.name
                              : taskScopeLabels[task.scope]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(task.assignee_count ?? 0) > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {task.completed_count ?? 0}/{task.assignee_count}
                          </span>
                          {task.assign_to_all && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              全員
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.due_date ? format(new Date(task.due_date), "yyyy/MM/dd") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {task.source === "console" ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Megaphone className="h-3 w-3" />
                            管理者
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {(task.creator?.display_name ?? task.creator?.email ?? "?")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-20">
                              {task.creator?.display_name ?? task.creator?.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="タスクを作成"
        tabs={addTabs}
        activeTab={addTab}
        onTabChange={setAddTab}
        onSave={handleAdd}
        saving={saving}
        saveDisabled={!newTitle.trim()}
        saveLabel="作成"
      >
        {addTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タスク名 *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例：サーベイに回答してください"
              />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="タスクの詳細を入力"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>優先度</Label>
                <Select value={newPriority} onValueChange={(v) => v && setNewPriority(v)}>
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
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
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
                      setNewScope(scope);
                      if (scope !== "project" && scope !== "team") {
                        setNewProjectId("");
                        setNewTeamId("");
                      }
                      if (scope !== "team") setNewTeamId("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                      newScope === scope
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

            {(newScope === "project" || newScope === "team") && (
              <div className="space-y-2">
                <Label>プロジェクト</Label>
                <Select
                  value={newProjectId}
                  onValueChange={(v) => {
                    if (v) setNewProjectId(v);
                    setNewTeamId("");
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

            {newScope === "team" && newProjectId && (
              <div className="space-y-2">
                <Label>チーム</Label>
                <Select value={newTeamId} onValueChange={(v) => v && setNewTeamId(v)}>
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
        )}
        {addTab === "assign" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>担当者の割り当て</Label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewAssignAll(true);
                    setNewAssigneeIds([]);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    newAssignAll
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  全従業員
                </button>
                <button
                  type="button"
                  onClick={() => setNewAssignAll(false)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    !newAssignAll
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  個別選択
                </button>
              </div>
            </div>

            {newAssignAll ? (
              <p className="text-sm text-muted-foreground">
                組織の全従業員（{employees.length}名）にタスクが割り当てられます。
              </p>
            ) : (
              <div className="space-y-2">
                <Label>担当者を選択（{newAssigneeIds.length}名選択中）</Label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {employees.map((e) => {
                    const selected = newAssigneeIds.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleAssignee(e.id)}
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
                          <p className="text-sm font-medium truncate">
                            {e.display_name ?? e.email}
                          </p>
                          {e.display_name && (
                            <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </EditPanel>
    </div>
  );
}
