"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { ArrowLeft, ClipboardCheck, UserCheck } from "lucide-react";
import { cn } from "@hr1/shared-ui/lib/utils";
import { useEvaluationCycles, useMyAssignments } from "@/lib/hooks/use-evaluations";
import { useAuth } from "@/lib/auth-context";
import {
  CYCLE_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  RATER_TYPE_LABELS,
} from "@/lib/evaluation-utils";

export default function EvaluationCycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const cycleId = params.cycleId as string;

  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    mutate: mutateCycles,
  } = useEvaluationCycles();
  const { data: assignments = [], isLoading: assignmentsLoading } = useMyAssignments(cycleId);

  const cycle = useMemo(() => cycles.find((c) => c.id === cycleId), [cycles, cycleId]);
  const myToEvaluate = assignments.filter((a) => a.evaluator_id === user?.id);
  const myReceived = assignments.filter((a) => a.target_user_id === user?.id);

  if (cyclesLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );
  }

  if (cyclesError) {
    return (
      <div className="flex flex-col">
        <QueryErrorBanner error={cyclesError} onRetry={() => mutateCycles()} />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="評価サイクルが見つかりません"
          sticky={false}
          border={false}
          breadcrumb={[{ label: "評価サイクル", href: "/evaluation-cycles" }]}
          action={
            <Button variant="ghost" size="sm" onClick={() => router.push("/evaluation-cycles")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              一覧に戻る
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={cycle.title}
        description={cycle.description ?? undefined}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "評価サイクル", href: "/evaluation-cycles" }]}
        action={
          <Button variant="ghost" size="sm" onClick={() => router.push("/evaluation-cycles")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            一覧に戻る
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-3xl space-y-6">
          {/* サイクル概要 */}
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={cycle.status === "active" ? "default" : "secondary"}>
                  {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                  {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                </span>
              </div>
            </CardContent>
          </Card>

          {assignmentsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : (
            <>
              {/* あなたが評価する */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  あなたが評価する
                </h3>
                {myToEvaluate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    このサイクルであなたが評価する対象はありません
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {myToEvaluate.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3",
                          a.status !== "skipped" &&
                            "cursor-pointer hover:bg-accent/30 transition-colors"
                        )}
                        onClick={() => {
                          if (a.status !== "skipped") {
                            router.push(`/evaluation-cycles/${cycleId}/assignments/${a.id}`);
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {a.target_profile?.display_name ?? a.target_profile?.email ?? "不明"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {RATER_TYPE_LABELS[a.rater_type] ?? a.rater_type}
                            </Badge>
                            <Badge
                              variant={
                                a.status === "submitted"
                                  ? "default"
                                  : a.status === "pending"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[10px]"
                            >
                              {ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status}
                            </Badge>
                          </div>
                        </div>
                        {a.due_date && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            期限: {format(new Date(a.due_date), "M/d")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* あなたの評価 */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  あなたの評価
                </h3>
                {myReceived.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    このサイクルであなたを対象とした評価はありません
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {myReceived.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {a.evaluator_profile?.display_name ?? "匿名"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {RATER_TYPE_LABELS[a.rater_type] ?? a.rater_type}
                            </Badge>
                            <Badge
                              variant={a.status === "submitted" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </PageContent>
    </div>
  );
}
