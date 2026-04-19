"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import {
  SummaryCards,
  type SummaryCardConfig,
} from "@hr1/shared-ui/components/layout/summary-cards";
import { ListTodo, CalendarClock, CalendarX, AlertTriangle } from "lucide-react";
import { useRecruiterTasks } from "@/features/recruiting/hooks/use-recruiter-tasks";

type SummaryKey = "total" | "withDueDate" | "overdue" | "failed";

export default function RecruitingTasksPage() {
  const router = useRouter();
  const { data: tasks = [], isLoading, error, mutate } = useRecruiterTasks();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const today = new Date().toISOString().slice(0, 10);
  const summary: Record<SummaryKey, number> = useMemo(() => {
    return {
      total: tasks.length,
      withDueDate: tasks.filter((t) => t.due_date != null).length,
      overdue: tasks.filter((t) => t.due_date != null && t.due_date < today).length,
      failed: tasks.filter((t) => t.target_count > 0 && t.created_count === 0).length,
    };
  }, [tasks, today]);

  const summaryCards: readonly SummaryCardConfig<SummaryKey>[] = [
    { key: "total", label: "タスク数", icon: ListTodo, iconClassName: "text-slate-600" },
    {
      key: "withDueDate",
      label: "期限あり",
      icon: CalendarClock,
      iconClassName: "text-blue-600",
    },
    { key: "overdue", label: "期限超過", icon: CalendarX, iconClassName: "text-red-600" },
    {
      key: "failed",
      label: "配信失敗",
      icon: AlertTriangle,
      iconClassName: "text-amber-600",
    },
  ];

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader
        title="応募者タスク"
        description="応募者に一括でタスクを配信・進捗管理します"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={() => router.push("/recruiting-tasks/new")}>
            タスクを作成
          </Button>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pt-2 pb-4">
        <SummaryCards cards={summaryCards} values={summary} />
      </div>

      <StickyFilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・説明で検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead className="text-right">配信数</TableHead>
              <TableHead>期日</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage="タスクがありません"
            >
              {filtered.map((task) => {
                const overdue = task.due_date != null && task.due_date < today;
                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/recruiting-tasks/${task.id}`)}
                  >
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {task.target_mode === "individual" ? "個別指定" : "条件指定"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.created_count} / {task.target_count}
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <span className={overdue ? "text-red-600 text-sm" : "text-sm"}>
                          {format(new Date(task.due_date), "yyyy/MM/dd")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(task.created_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
