"use client";

import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hr1/shared-ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTaskDetailPage } from "@/lib/hooks/use-task-detail-page";
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
  const { showToast } = useToast();
  const h = useTaskDetailPage();

  const handleSaveEdit = async () => {
    const result = await h.handleSaveEdit();
    if (result.success) {
      showToast("タスクを更新しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const result = await h.handleStatusChange(newStatus);
    if (result.success) {
      showToast("ステータスを更新しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleDelete = async () => {
    const result = await h.handleDelete();
    if (result.success) {
      showToast("タスクを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleAssigneeStatusChange = async (assigneeId: string, newStatus: string) => {
    const result = await h.handleAssigneeStatusChange(assigneeId, newStatus);
    if (result.success) {
      showToast("ステータスを更新しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleRemoveAssignee = async (assigneeId: string) => {
    const result = await h.handleRemoveAssignee(assigneeId);
    if (result.success) {
      showToast("担当者を削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleAddAssignees = async () => {
    const result = await h.handleAddAssignees();
    if (result.success) {
      showToast("担当者を追加しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  if (h.loading || !h.task) {
    return (
      <>
        <PageHeader title="タスク詳細" breadcrumb={[{ label: "タスク", href: "/tasks" }]} />
        <div className="px-4 py-8 sm:px-6 md:px-8 text-center text-muted-foreground">
          {h.loading ? "読み込み中..." : "タスクが見つかりません"}
        </div>
      </>
    );
  }

  const StatusIcon = statusIcons[h.task.status] ?? Circle;
  const ScopeIcon = scopeIcons[h.task.scope] ?? Globe;

  return (
    <>
      <PageHeader
        title={h.task.title}
        breadcrumb={[{ label: "タスク", href: "/tasks" }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={h.openEditPanel}>
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
                        h.task.status === "completed" && "text-green-600",
                        h.task.status === "in_progress" && "text-blue-600",
                        h.task.status === "cancelled" && "text-muted-foreground",
                        h.task.status === "open" && "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">{taskStatusLabels[h.task.status]}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(taskStatusLabels).map(([k, v]) => (
                      <DropdownMenuItem
                        key={k}
                        onClick={() => handleStatusChange(k)}
                        className={cn(h.task!.status === k && "font-medium")}
                      >
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">優先度</Label>
                <Badge variant={taskPriorityColors[h.task.priority]}>
                  {taskPriorityLabels[h.task.priority]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">期限</Label>
                <span className="text-sm">
                  {h.task.due_date ? format(new Date(h.task.due_date), "yyyy/MM/dd") : "未設定"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">作成者</Label>
                <span className="text-sm">
                  {h.task.source === "console"
                    ? "管理者"
                    : (h.task.creator?.display_name ?? h.task.creator?.email)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">作成日</Label>
                <span className="text-sm">
                  {format(new Date(h.task.created_at), "yyyy/MM/dd HH:mm")}
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
                    {h.task.scope === "project" && h.task.projects?.name
                      ? h.task.projects.name
                      : h.task.scope === "team" && h.task.project_teams?.name
                        ? h.task.project_teams.name
                        : taskScopeLabels[h.task.scope]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">ソース</Label>
                <span className="text-sm">{taskSourceLabels[h.task.source]}</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">担当者数</Label>
                <span className="text-sm">
                  {h.assignees.length}名
                  {h.task.assign_to_all && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                      全員
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">進捗</Label>
                <span className="text-sm font-medium">
                  {h.completedCount}/{h.assignees.length} 完了
                </span>
              </div>
              {h.assignees.length > 0 && (
                <div className="pt-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${h.assignees.length > 0 ? (h.completedCount / h.assignees.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 説明 */}
        {h.task.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">説明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{h.task.description}</p>
            </CardContent>
          </Card>
        )}

        {/* 担当者一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">担当者一覧</h3>
            <Button variant="outline" size="sm" onClick={h.openAssignDialog}>
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
                  isEmpty={h.assignees.length === 0}
                  emptyMessage="担当者が割り当てられていません"
                >
                  {h.assignees.map((a) => (
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
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="タスクを編集"
        saving={h.savingEdit}
        onSave={handleSaveEdit}
        saveDisabled={!h.editTitle.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タスク名 *</Label>
            <Input value={h.editTitle} onChange={(e) => h.setEditTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Textarea
              value={h.editDescription}
              onChange={(e) => h.setEditDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>優先度</Label>
              <Select value={h.editPriority} onValueChange={(v) => v && h.setEditPriority(v)}>
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
                value={h.editDueDate}
                onChange={(e) => h.setEditDueDate(e.target.value)}
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
                  onClick={() => h.handleEditScopeChange(scope)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    h.editScope === scope
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
          {(h.editScope === "project" || h.editScope === "team") && (
            <div className="space-y-2">
              <Label>プロジェクト</Label>
              <Select value={h.editProjectId} onValueChange={h.handleEditProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="プロジェクトを選択">
                    {(v: string) => h.projects.find((p) => p.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {h.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {h.editScope === "team" && h.editProjectId && (
            <div className="space-y-2">
              <Label>チーム</Label>
              <Select value={h.editTeamId} onValueChange={(v) => v && h.setEditTeamId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="チームを選択">
                    {(v: string) => h.teams.find((t) => t.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {h.teams.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      チームがありません
                    </div>
                  ) : (
                    h.teams.map((t) => (
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
        open={h.assignDialogOpen}
        onOpenChange={h.setAssignDialogOpen}
        title="担当者を追加"
        saving={h.savingAssign}
        onSave={handleAddAssignees}
        saveDisabled={h.selectedEmployeeIds.length === 0}
        saveLabel="追加"
      >
        <div className="space-y-2">
          <Label>担当者を選択（{h.selectedEmployeeIds.length}名選択中）</Label>
          <div className="border rounded-lg max-h-72 overflow-y-auto">
            {h.allEmployees.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                追加可能な従業員がいません
              </div>
            ) : (
              h.allEmployees.map((e) => {
                const selected = h.selectedEmployeeIds.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => h.toggleSelectedEmployee(e.id)}
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
