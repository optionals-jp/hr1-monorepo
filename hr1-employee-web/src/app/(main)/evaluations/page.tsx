"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useEvaluationCycles, useMyAssignments } from "@/lib/hooks/use-evaluations";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Star, ClipboardCheck, UserCheck } from "lucide-react";
import { format } from "date-fns";

const cycleStatusLabels: Record<string, string> = {
  active: "実施中",
  closed: "終了",
  finalized: "確定",
};

const assignmentStatusLabels: Record<string, string> = {
  pending: "未着手",
  in_progress: "進行中",
  submitted: "提出済",
  skipped: "スキップ",
};

const raterTypeLabels: Record<string, string> = {
  supervisor: "上司",
  peer: "同僚",
  subordinate: "部下",
  self: "自己",
  external: "外部",
};

export default function EvaluationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    data: cycles = [],
    isLoading: cyclesLoading,
    error: cyclesError,
    mutate: mutateCycles,
  } = useEvaluationCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useMyAssignments(selectedCycleId);

  const myToEvaluate = assignments.filter((a) => a.evaluator_id === user?.id);
  const myReceived = assignments.filter((a) => a.target_user_id === user?.id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="評価"
        description="評価サイクルと自分の評価"
        sticky={false}
        border={false}
      />
      {cyclesError && <QueryErrorBanner error={cyclesError} onRetry={() => mutateCycles()} />}

      <PageContent>
        {cyclesLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : cycles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Star className="h-10 w-10 opacity-40" />
            <p className="text-sm">評価サイクルがありません</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">評価サイクル</h3>
              {cycles.map((cycle) => (
                <Card
                  key={cycle.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent/30",
                    selectedCycleId === cycle.id && "border-primary"
                  )}
                  onClick={() => setSelectedCycleId(selectedCycleId === cycle.id ? null : cycle.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{cycle.title}</CardTitle>
                      <Badge
                        variant={cycle.status === "active" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {cycleStatusLabels[cycle.status] ?? cycle.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cycle.description && (
                      <p className="text-xs text-muted-foreground">{cycle.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                      {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedCycleId && (
              <div className="space-y-6">
                {assignmentsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    読み込み中...
                  </div>
                ) : (
                  <>
                    {myToEvaluate.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4" />
                          あなたが評価する
                        </h3>
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
                                  router.push(`/evaluations/${a.id}`);
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {a.target_profile?.display_name ??
                                    a.target_profile?.email ??
                                    "不明"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px]">
                                    {raterTypeLabels[a.rater_type] ?? a.rater_type}
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
                                    {assignmentStatusLabels[a.status] ?? a.status}
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
                      </div>
                    )}

                    {myReceived.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          あなたの評価
                        </h3>
                        <div className="divide-y rounded-lg border">
                          {myReceived.map((a) => (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {a.evaluator_profile?.display_name ?? "匿名"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px]">
                                    {raterTypeLabels[a.rater_type] ?? a.rater_type}
                                  </Badge>
                                  <Badge
                                    variant={a.status === "submitted" ? "default" : "secondary"}
                                    className="text-[10px]"
                                  >
                                    {assignmentStatusLabels[a.status] ?? a.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {myToEvaluate.length === 0 && myReceived.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        このサイクルであなたに関連する評価はありません
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </PageContent>
    </div>
  );
}
