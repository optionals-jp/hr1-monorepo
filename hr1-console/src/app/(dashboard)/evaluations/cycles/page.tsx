"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/lib/org-context";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { cycleStatusLabels, cycleStatusColors } from "@/lib/constants";
import { useEvaluationCyclesWithDetails } from "@/lib/hooks/use-evaluations";

export default function EvaluationCyclesPage() {
  const router = useRouter();
  useOrg();

  const {
    data: cycles,
    isLoading,
    error: cyclesError,
    mutate: mutateCycles,
  } = useEvaluationCyclesWithDetails();

  return (
    <>
      <PageHeader
        title="評価サイクル"
        description="多面評価の実施管理"
        breadcrumb={[{ label: "評価管理", href: "/evaluations" }]}
        action={
          <Button onClick={() => router.push("/evaluations/cycles/new")}>サイクルを作成</Button>
        }
      />

      <QueryErrorBanner error={cyclesError} onRetry={() => mutateCycles()} />

      <PageContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
        ) : !cycles || cycles.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">評価サイクルがありません</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>サイクル名</TableHead>
                  <TableHead>評価シート</TableHead>
                  <TableHead>期間</TableHead>
                  <TableHead>進捗</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow
                    key={cycle.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/evaluations/cycles/${cycle.id}`)}
                  >
                    <TableCell className="font-medium">{cycle.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cycle.template_title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                      {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cycle.assignment_count > 0 ? (
                        <span>
                          {cycle.submitted_count}/{cycle.assignment_count}
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((cycle.submitted_count / cycle.assignment_count) * 100)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cycleStatusColors[cycle.status]}>
                        {cycleStatusLabels[cycle.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>
    </>
  );
}
