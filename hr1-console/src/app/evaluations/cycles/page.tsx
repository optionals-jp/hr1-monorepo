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
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase";
import { cycleStatusLabels, cycleStatusColors } from "@/lib/constants";
import type { EvaluationCycle } from "@/types/database";

export default function EvaluationCyclesPage() {
  const router = useRouter();
  const { organization } = useOrg();

  const { data: cycles, isLoading } = useQuery<
    (EvaluationCycle & {
      template_title: string;
      assignment_count: number;
      submitted_count: number;
    })[]
  >(organization ? `eval-cycles-${organization.id}` : null, async () => {
    if (!organization) return [];
    const { data: cycleData } = await getSupabase()
      .from("evaluation_cycles")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (!cycleData || cycleData.length === 0) return [];

    const templateIds = [...new Set(cycleData.map((c) => c.template_id))];
    const cycleIds = cycleData.map((c) => c.id);

    const [{ data: templates }, { data: assignments }] = await Promise.all([
      getSupabase().from("evaluation_templates").select("id, title").in("id", templateIds),
      getSupabase()
        .from("evaluation_assignments")
        .select("id, cycle_id, status")
        .in("cycle_id", cycleIds),
    ]);

    const titleMap = new Map<string, string>();
    for (const t of templates ?? []) titleMap.set(t.id, t.title);

    return cycleData.map((c) => {
      const cycleAssignments = (assignments ?? []).filter((a) => a.cycle_id === c.id);
      return {
        ...c,
        template_title: titleMap.get(c.template_id) ?? "",
        assignment_count: cycleAssignments.length,
        submitted_count: cycleAssignments.filter((a) => a.status === "submitted").length,
      };
    });
  });

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
