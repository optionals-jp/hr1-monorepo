"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { useOrg } from "@/lib/org-context";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import {
  formTargetLabels,
  evaluationTypeLabels,
  cycleStatusLabels,
  cycleStatusColors,
} from "@/lib/constants";
import {
  useEvaluationTemplates,
  useEvaluationCyclesWithDetails,
} from "@/lib/hooks/use-evaluations";
import { FileText, RefreshCw, HelpCircle, Download } from "lucide-react";
import { GuideView } from "@/features/evaluations/components/guide-view";
import { exportToCSV, csvFilenameWithDate } from "@/lib/export-csv";

const subTabs = [
  { value: "sheets", label: "評価シート" },
  { value: "cycles", label: "評価サイクル" },
  { value: "guide", label: "使い方", icon: HelpCircle },
];

export default function EvaluationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "cycles" ? "cycles" : tabParam === "guide" ? "guide" : "sheets";
  useOrg();

  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useEvaluationTemplates();

  const { data: cycles = [], isLoading: cyclesLoading } = useEvaluationCyclesWithDetails();

  const setActiveTab = (tab: string) => {
    if (tab === "cycles") router.push("/evaluations?tab=cycles");
    else if (tab === "guide") router.push("/evaluations?tab=guide");
    else router.push("/evaluations");
  };

  const hasSheets = templates.length > 0;
  const hasMultiRaterSheets = templates.some((t) => t.evaluation_type === "multi_rater");
  const hasCycles = cycles.length > 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="評価管理"
        description="評価シートの作成・管理と評価サイクルの運用"
        sticky={false}
        action={
          activeTab === "sheets" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (templates.length === 0) return;
                  exportToCSV(
                    templates.map((t) => ({
                      ...t,
                      _type: evaluationTypeLabels[t.evaluation_type] ?? t.evaluation_type,
                      _target: formTargetLabels[t.target] ?? t.target,
                      _description: t.description ?? "",
                      _createdAt: t.created_at,
                    })),
                    [
                      { key: "title", label: "評価シート名" },
                      { key: "_type", label: "タイプ" },
                      { key: "_target", label: "対象" },
                      { key: "_description", label: "説明" },
                      { key: "_createdAt", label: "作成日" },
                    ],
                    csvFilenameWithDate("評価シート一覧")
                  );
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV出力
              </Button>
              <Link href="/evaluations/new">
                <Button>評価シートを作成</Button>
              </Link>
            </div>
          ) : activeTab === "cycles" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (cycles.length === 0) return;
                  exportToCSV(
                    cycles.map((c) => ({
                      ...c,
                      _templateTitle: c.template_title,
                      _period: `${format(new Date(c.start_date), "yyyy/MM/dd")} 〜 ${format(new Date(c.end_date), "yyyy/MM/dd")}`,
                      _progress:
                        c.assignment_count > 0
                          ? `${c.submitted_count}/${c.assignment_count} (${Math.round((c.submitted_count / c.assignment_count) * 100)}%)`
                          : "-",
                      _status: cycleStatusLabels[c.status] ?? c.status,
                    })),
                    [
                      { key: "title", label: "サイクル名" },
                      { key: "_templateTitle", label: "評価シート" },
                      { key: "_period", label: "期間" },
                      { key: "_progress", label: "進捗" },
                      { key: "_status", label: "ステータス" },
                    ],
                    csvFilenameWithDate("評価サイクル一覧")
                  );
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                CSV出力
              </Button>
              <Link href="/evaluations/cycles/new">
                <Button>サイクルを作成</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      <QueryErrorBanner error={templatesError} onRetry={() => mutateTemplates()} />

      {/* サブナビゲーション */}
      <StickyFilterBar>
        <TabBar tabs={subTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {/* 評価シート一覧 */}
      {activeTab === "sheets" && (
        <TableSection>
          {!templatesLoading && templates.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">評価シートがありません</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  評価シートは「何を」「どう」評価するかを定めた設計図です。
                  まずは評価シートを作成して、評価項目を設定しましょう。
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link href="/evaluations/new">
                  <Button>評価シートを作成</Button>
                </Link>
                <Button variant="outline" onClick={() => setActiveTab("guide")}>
                  使い方を見る
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>評価シート名</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={5}
                  isLoading={templatesLoading}
                  isEmpty={templates.length === 0}
                  emptyMessage="評価シートがありません"
                >
                  {templates.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/evaluations/${t.id}`)}
                    >
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={t.evaluation_type === "multi_rater" ? "default" : "outline"}
                        >
                          {evaluationTypeLabels[t.evaluation_type] ?? t.evaluation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formTargetLabels[t.target] ?? t.target}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {t.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(t.created_at), "yyyy/MM/dd")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          )}
        </TableSection>
      )}

      {/* 評価サイクル一覧 */}
      {activeTab === "cycles" && (
        <TableSection>
          {cyclesLoading ? (
            <p className="text-center py-8 text-muted-foreground">読み込み中...</p>
          ) : cycles.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <RefreshCw className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">評価サイクルがありません</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  評価サイクルは、多面評価（360度）を実施するための仕組みです。
                  {hasMultiRaterSheets
                    ? "多面評価シートが作成済みなので、サイクルを作成して評価を開始できます。"
                    : "まず「多面評価」タイプの評価シートを作成してから、サイクルを作成してください。"}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {hasMultiRaterSheets ? (
                  <Link href="/evaluations/cycles/new">
                    <Button>サイクルを作成</Button>
                  </Link>
                ) : (
                  <Link href="/evaluations/new">
                    <Button>多面評価シートを作成</Button>
                  </Link>
                )}
                <Button variant="outline" onClick={() => setActiveTab("guide")}>
                  使い方を見る
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </TableSection>
      )}

      {/* 使い方ガイド */}
      {activeTab === "guide" && (
        <div className="">
          <GuideView
            hasSheets={hasSheets}
            hasMultiRaterSheets={hasMultiRaterSheets}
            hasCycles={hasCycles}
          />
        </div>
      )}
    </div>
  );
}
