"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Trash2, CheckCircle2, Circle } from "lucide-react";
import {
  useRecruiterTaskDetail,
  useDeleteRecruiterTask,
  useRecruiterTasks,
} from "@/features/recruiting/hooks/use-recruiter-tasks";
import { applicationStatusLabels, stepTypeLabels } from "@/lib/constants";

export default function RecruitingTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { data, isLoading, error, mutate } = useRecruiterTaskDetail(id);
  const { mutate: mutateList } = useRecruiterTasks();
  const { remove, deleting } = useDeleteRecruiterTask();

  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <QueryErrorBanner error={error} onRetry={() => mutate()} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        タスクが見つかりません
      </div>
    );
  }

  const { task, targets } = data;
  const completedCount = targets.filter((t) => t.is_completed).length;
  const criteria = task.target_criteria;

  const handleDelete = async () => {
    try {
      await remove(task.id);
      showToast("タスクを削除しました");
      mutateList();
      router.push("/recruiting-tasks");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "削除に失敗しました", "error");
    }
  };

  return (
    <>
      <PageHeader
        title={task.title}
        description={task.description ?? undefined}
        breadcrumb={[{ label: "応募者タスク", href: "/recruiting-tasks" }]}
        sticky={false}
        action={
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" />
            削除
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-4xl space-y-6">
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3">タスク情報</h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">対象</span>
                <Badge variant="outline">
                  {task.target_mode === "individual" ? "個別指定" : "条件指定"}
                </Badge>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">配信数</span>
                <span className="tabular-nums">
                  {task.created_count} / {task.target_count} 人
                  {task.created_count < task.target_count && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      （既に同一タスクを受け取り済みの候補者はスキップ）
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">完了</span>
                <span className="tabular-nums">
                  {completedCount} / {targets.length} 人
                </span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">期日</span>
                <span>{task.due_date ? format(new Date(task.due_date), "yyyy/MM/dd") : "-"}</span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">アクション URL</span>
                <span className="font-mono text-xs break-all">{task.action_url ?? "-"}</span>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-24 shrink-0">作成日</span>
                <span>{format(new Date(task.created_at), "yyyy/MM/dd HH:mm")}</span>
              </div>
            </div>
          </SectionCard>

          {task.target_mode === "filter" && (
            <SectionCard>
              <h2 className="text-sm font-semibold mb-3">抽出条件</h2>
              <div className="space-y-2 text-sm">
                {criteria.hiring_type && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-24 shrink-0">採用区分</span>
                    <span>
                      {criteria.hiring_type === "new_grad"
                        ? "新卒"
                        : criteria.hiring_type === "mid_career"
                          ? "中途"
                          : "未設定"}
                    </span>
                  </div>
                )}
                {criteria.job_id && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-24 shrink-0">求人 ID</span>
                    <span className="font-mono text-xs">{criteria.job_id}</span>
                  </div>
                )}
                {criteria.application_status && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-24 shrink-0">応募ステータス</span>
                    <span>
                      {applicationStatusLabels[criteria.application_status] ??
                        criteria.application_status}
                    </span>
                  </div>
                )}
                {criteria.selection_step && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-24 shrink-0">選考ステップ</span>
                    <span>
                      {stepTypeLabels[criteria.selection_step.step_type] ??
                        criteria.selection_step.step_type}
                      {criteria.selection_step.min_step_order != null &&
                        `（順序 ${criteria.selection_step.min_step_order} 以降）`}
                      {criteria.selection_step.mode === "passed" ? " を通過済み" : " に滞在中"}
                    </span>
                  </div>
                )}
                {!criteria.hiring_type &&
                  !criteria.job_id &&
                  !criteria.application_status &&
                  !criteria.selection_step && (
                    <p className="text-muted-foreground">条件なし（組織内の全候補者）</p>
                  )}
              </div>
            </SectionCard>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-3">配信先の応募者</h2>
            <TableSection>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>候補者</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>期日</TableHead>
                    <TableHead>完了日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableEmptyState
                    colSpan={5}
                    isLoading={false}
                    isEmpty={targets.length === 0}
                    emptyMessage="配信先がありません"
                  >
                    {targets.map((t) => (
                      <TableRow key={t.user_id}>
                        <TableCell>
                          {t.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {t.avatar_url ? (
                                <AvatarImage src={t.avatar_url} alt={t.display_name ?? ""} />
                              ) : (
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                                  {(t.display_name ?? t.email)[0]}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="font-medium">{t.display_name ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.email}</TableCell>
                        <TableCell className="text-sm">
                          {t.due_date ? format(new Date(t.due_date), "yyyy/MM/dd") : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.completed_at
                            ? format(new Date(t.completed_at), "yyyy/MM/dd HH:mm")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableEmptyState>
                </TableBody>
              </Table>
            </TableSection>
          </div>
        </div>
      </PageContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="タスクを削除"
        description="このタスクと、配信済みの応募者タスクをすべて削除します。完了済みの記録も失われます。"
        variant="destructive"
        confirmLabel="削除"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
