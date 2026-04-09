"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyTasks } from "@/lib/hooks/use-my-tasks";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ListTodo, Circle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { TaskStatus } from "@/types/database";

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  open: { label: "未着手", icon: Circle, color: "text-gray-500" },
  in_progress: { label: "進行中", icon: Clock, color: "text-blue-600" },
  completed: { label: "完了", icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "中止", icon: AlertCircle, color: "text-red-600" },
};

const priorityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export default function TasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: tasks = [], isLoading, error, mutate, updateStatus } = useMyTasks();
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const handleStatusChange = async (
    task: (typeof tasks)[0],
    newStatus: "in_progress" | "completed"
  ) => {
    const assignee = task.task_assignees?.find((a) => a.user_id === user?.id);
    if (!assignee) return;
    try {
      await updateStatus(assignee.id, newStatus);
      showToast(newStatus === "completed" ? "タスクを完了しました" : "タスクに着手しました");
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="タスク"
        description="あなたに割り当てられたタスク"
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <Badge
                key={s}
                variant={filter === s ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "すべて" : statusConfig[s].label}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <ListTodo className="h-10 w-10 opacity-40" />
              <p className="text-sm">タスクがありません</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filtered.map((task) => {
                const config = statusConfig[task.status];
                const Icon = config.icon;
                const assignee = task.task_assignees?.find((a) => a.user_id === user?.id);
                const isDue =
                  task.due_date &&
                  new Date(task.due_date) < new Date() &&
                  task.status !== "completed";

                return (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant={
                            task.priority === "urgent"
                              ? "destructive"
                              : task.priority === "high"
                                ? "default"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                        {task.due_date && (
                          <span
                            className={cn(
                              "text-[11px]",
                              isDue ? "text-red-600 font-medium" : "text-muted-foreground"
                            )}
                          >
                            期限: {format(new Date(task.due_date), "M/d")}
                          </span>
                        )}
                      </div>
                    </div>
                    {assignee && task.status !== "completed" && task.status !== "cancelled" && (
                      <div className="shrink-0">
                        {assignee.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(task, "in_progress")}
                          >
                            着手
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleStatusChange(task, "completed")}>
                            完了
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
