"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { activityTypeLabels } from "@/lib/constants/crm";
import { Phone, Mail, Calendar, MapPin, FileText, CheckCircle2, Circle, Clock } from "lucide-react";
import type { BcActivity, BcTodo } from "@/types/database";

const activityTypeIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  appointment: Calendar,
  visit: MapPin,
  memo: FileText,
};

interface RecentActivitiesCardProps {
  activities: BcActivity[] | undefined;
  formatDateTime: (dateStr: string | null) => string;
}

export function RecentActivitiesCard({ activities, formatDateTime }: RecentActivitiesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近の活動</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">活動記録がありません</p>
        ) : (
          <div className="space-y-4">
            {activities.map((a) => {
              const Ic = activityTypeIcons[a.activity_type] ?? FileText;
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-2 mt-0.5 shrink-0">
                    <Ic className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{a.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {activityTypeLabels[a.activity_type] ?? a.activity_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.profiles?.display_name && (
                        <span className="text-xs text-muted-foreground">
                          {a.profiles.display_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UpcomingTodosCardProps {
  todos: BcTodo[] | undefined;
  onToggle: (todoId: string, currentCompleted: boolean) => void;
  formatDate: (dateStr: string | null) => string;
  isOverdue: (dueDate: string | null, isCompleted?: boolean) => boolean;
}

export function UpcomingTodosCard({
  todos,
  onToggle,
  formatDate,
  isOverdue,
}: UpcomingTodosCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">TODO</CardTitle>
      </CardHeader>
      <CardContent>
        {!todos ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">未完了のTODOはありません</p>
        ) : (
          <div className="space-y-3">
            {todos.map((t) => {
              const overdue = isOverdue(t.due_date);
              return (
                <div key={t.id} className="flex items-start gap-3">
                  <button
                    onClick={() => onToggle(t.id, t.is_completed)}
                    className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity"
                  >
                    {t.is_completed ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${t.is_completed ? "line-through text-muted-foreground" : ""}`}
                    >
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.due_date && (
                        <span
                          className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                        >
                          <Clock className="size-3" />
                          {formatDate(t.due_date)}
                          {overdue && " (期限超過)"}
                        </span>
                      )}
                      {t.profiles?.display_name && (
                        <span className="text-xs text-muted-foreground">
                          {t.profiles.display_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
