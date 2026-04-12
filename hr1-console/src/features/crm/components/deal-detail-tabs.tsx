"use client";

import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { activityTypeLabels } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  User,
  ChevronRight,
} from "lucide-react";
import type { BcActivity, BcTodo, CrmDealStageHistory } from "@/types/database";
import type { ActivityIconType } from "@/features/crm/rules";

const activityIconMap: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  appointment: Calendar,
  visit: MapPin,
  memo: FileText,
};

interface ActivitiesTabProps {
  activities: BcActivity[] | undefined;
  getActivityIconType: (type: string) => ActivityIconType;
  onAddClick: () => void;
}

export function ActivitiesTab({ activities, getActivityIconType, onAddClick }: ActivitiesTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">活動履歴</h3>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="size-4 mr-1" />
          活動を記録
        </Button>
      </div>
      {!activities || activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">活動履歴がありません</p>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const iconType = getActivityIconType(act.activity_type);
            const Ic = activityIconMap[iconType] ?? FileText;
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
                    <span>{act.activity_date?.slice(0, 10) ?? act.created_at.slice(0, 10)}</span>
                    {act.profiles && <span>{act.profiles.display_name ?? act.profiles.email}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TodosTabProps {
  todos: BcTodo[] | undefined;
  onAddClick: () => void;
  onToggle: (todoId: string, completed: boolean) => void;
}

export function TodosTab({ todos, onAddClick, onToggle }: TodosTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">TODO</h3>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="size-4 mr-1" />
          TODOを追加
        </Button>
      </div>
      {!todos || todos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">TODOがありません</p>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => {
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
                  onClick={() => onToggle(todo.id, !todo.is_completed)}
                >
                  {todo.is_completed ? (
                    <CheckCircle2 className="size-5 text-green-600" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", todo.is_completed && "line-through")}>
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
  );
}

interface StageHistoryTabProps {
  stageHistory: CrmDealStageHistory[] | undefined;
}

export function StageHistoryTab({ stageHistory }: StageHistoryTabProps) {
  return (
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
  );
}
