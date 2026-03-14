"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import {
  formTargetLabels,
  evaluationTypeLabels,
  cycleStatusLabels,
  cycleStatusColors,
} from "@/lib/constants";
import {
  FileText,
  ListChecks,
  Anchor,
  RefreshCw,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  HelpCircle,
} from "lucide-react";
import type { EvaluationTemplate, EvaluationCycle } from "@/types/database";

const subTabs = [
  { value: "sheets", label: "評価シート" },
  { value: "cycles", label: "評価サイクル" },
  { value: "guide", label: "使い方", icon: HelpCircle },
];

/** ガイド：ステップカード */
function StepCard({
  step,
  title,
  description,
  details,
  icon: Icon,
  done,
}: {
  step: number;
  title: string;
  description: string;
  details: string[];
  icon: React.ElementType;
  done?: boolean;
}) {
  return (
    <Card className={cn(done && "border-green-200 bg-green-50/30")}>
      <CardContent className="pt-5 pb-5">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              done ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
            )}
          >
            {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Step {step}
              </span>
              {done && (
                <Badge variant="secondary" className="text-xs text-green-700 bg-green-100">
                  完了
                </Badge>
              )}
            </div>
            <p className="font-semibold text-[15px]">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <ul className="space-y-1.5 pt-1">
              {details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CircleDot className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                  <span className="text-muted-foreground">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** ガイド：用語カード */
function TermCard({
  term,
  description,
  icon: Icon,
}: {
  term: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-white">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
      </div>
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-sm">{term}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/** ガイドビュー */
function GuideView({
  hasSheets,
  hasMultiRaterSheets,
  hasCycles,
}: {
  hasSheets: boolean;
  hasMultiRaterSheets: boolean;
  hasCycles: boolean;
}) {
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 space-y-8 max-w-3xl">
      {/* 全体の流れ */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">評価管理の仕組み</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          評価管理では、社員や応募者に対する人事評価を体系的に行えます。
          評価の「ひな型」を作り、それを使って実際の評価を行う流れです。
        </p>
      </div>

      {/* フロー図 */}
      <div className="flex items-center gap-2 px-2 py-3 rounded-lg bg-muted/50 overflow-x-auto">
        {[
          { label: "評価シート作成", sub: "何を評価するか決める" },
          { label: "評価項目を設定", sub: "基準とスコア方法を定義" },
          { label: "評価を実施", sub: "単独 or サイクルで運用" },
          { label: "結果を確認", sub: "統計・比較・レポート" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            <div className="text-center px-3 py-2 rounded-md bg-white border min-w-28">
              <p className="text-sm font-medium whitespace-nowrap">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 2つの評価タイプ */}
      <div className="space-y-3">
        <h3 className="font-semibold">2つの評価タイプ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-5 pb-5 space-y-2">
              <Badge variant="outline">単独評価</Badge>
              <p className="text-sm text-muted-foreground leading-relaxed">
                1人の評価者が1人の対象者を評価するシンプルな形式です。面接評価や上司による人事考課など、日常的な評価に使います。
              </p>
              <p className="text-xs text-muted-foreground">例：面接評価シート、試用期間評価</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5 space-y-2">
              <Badge>多面評価（360度）</Badge>
              <p className="text-sm text-muted-foreground leading-relaxed">
                上司・同僚・部下・自己など、複数の視点から1人を評価する形式です。「評価サイクル」を作成して運用します。バイアスを減らし、客観的な評価が可能です。
              </p>
              <p className="text-xs text-muted-foreground">
                例：年次360度フィードバック、リーダーシップ評価
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ステップガイド */}
      <div className="space-y-3">
        <h3 className="font-semibold">はじめかた</h3>
        <div className="space-y-3">
          <StepCard
            step={1}
            title="評価シートを作成する"
            description="「何を」「どうやって」評価するかの設計図を作ります。"
            icon={FileText}
            done={hasSheets}
            details={[
              "評価シート名と対象（応募者向け・社内向け・両方）を設定",
              "単独評価 か 多面評価（360度）かを選択",
              "多面評価の場合は匿名設定も可能（同僚・部下からの率直なフィードバック用）",
            ]}
          />

          <StepCard
            step={2}
            title="評価項目を追加する"
            description="具体的に評価する項目と、その採点方法を定義します。"
            icon={ListChecks}
            done={hasSheets}
            details={[
              "各項目に 5段階評価・10点評価・選択式・テキスト のいずれかを設定",
              "項目ごとに「重み」を設定して、重要な項目の比重を高くできる",
              "行動アンカー（BARS）で各スコアの具体的な基準を定義すると、評価者間のブレを軽減",
            ]}
          />

          <StepCard
            step={3}
            title="評価を実施する"
            description="作成した評価シートを使って、実際の評価を行います。"
            icon={Users}
            done={hasCycles}
            details={[
              "単独評価：社員や応募者の詳細画面から評価シートを選んで直接評価",
              "多面評価：「評価サイクル」を作成 → 対象者と評価者の組み合わせを登録 → 期間内に各評価者が回答",
              "サイクルのステータス管理：準備中 → 実施中 → 締切済み → 調整中 → 確定",
            ]}
          />

          <StepCard
            step={4}
            title="結果を確認・分析する"
            description="集まった評価データを確認し、フィードバックに活用します。"
            icon={BarChart3}
            details={[
              "単独評価：評価シート詳細の「統計」「比較」タブで項目別の分布や評価者間比較を確認",
              "多面評価：サイクル詳細の「集計レポート」で対象者ごとの平均・標準偏差・評価者タイプ別の比較を確認",
              "標準偏差が大きい項目は評価者間の意見が割れている → キャリブレーション（調整）が必要",
            ]}
          />
        </div>
      </div>

      {/* 用語集 */}
      <div className="space-y-3">
        <h3 className="font-semibold">用語</h3>
        <div className="grid grid-cols-1 gap-2">
          <TermCard
            term="評価シート"
            description="評価の設計図。「何を評価するか」「どう採点するか」を定義したもの。繰り返し使えます。"
            icon={FileText}
          />
          <TermCard
            term="評価項目"
            description="評価シートの中の個々の評価ポイント。例：「コミュニケーション能力」「技術力」「リーダーシップ」"
            icon={ListChecks}
          />
          <TermCard
            term="行動アンカー（BARS）"
            description="各スコア（例: 1〜5）に対応する具体的な行動の説明。「3 = 期待通り」「5 = 卓越している」のように定義することで、評価者によるスコアのブレを減らします。"
            icon={Anchor}
          />
          <TermCard
            term="評価サイクル"
            description="多面評価を実施するための期間・単位。「2026年度上期評価」のように名前を付け、開始日・終了日を設定して運用します。"
            icon={RefreshCw}
          />
          <TermCard
            term="評価者タイプ"
            description="多面評価で「誰が評価するか」を区別する分類。上司・同僚・部下・自己・外部の5種類があります。複数の視点から評価することでバイアスを減らします。"
            icon={Users}
          />
          <TermCard
            term="標準偏差（SD）"
            description="評価のバラつきを示す数値。値が大きいほど評価者間で意見が分かれています。SDが大きい項目はキャリブレーション（すり合わせ）が必要です。"
            icon={BarChart3}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3 pt-2">
        {!hasSheets ? (
          <Link href="/evaluations/new">
            <Button>最初の評価シートを作成する</Button>
          </Link>
        ) : !hasMultiRaterSheets ? (
          <Link href="/evaluations/new">
            <Button>多面評価シートを作成する</Button>
          </Link>
        ) : !hasCycles ? (
          <Link href="/evaluations/cycles/new">
            <Button>最初のサイクルを作成する</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function EvaluationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "cycles" ? "cycles" : tabParam === "guide" ? "guide" : "sheets";
  const { organization } = useOrg();

  const { data: templates = [], isLoading: templatesLoading } = useQuery<EvaluationTemplate[]>(
    organization ? `eval-templates-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("evaluation_templates")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<
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

    const [{ data: tplData }, { data: assignments }] = await Promise.all([
      getSupabase().from("evaluation_templates").select("id, title").in("id", templateIds),
      getSupabase()
        .from("evaluation_assignments")
        .select("id, cycle_id, status")
        .in("cycle_id", cycleIds),
    ]);

    const titleMap = new Map<string, string>();
    for (const t of tplData ?? []) titleMap.set(t.id, t.title);

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
            <Link href="/evaluations/new">
              <Button>評価シートを作成</Button>
            </Link>
          ) : activeTab === "cycles" ? (
            <Link href="/evaluations/cycles/new">
              <Button>サイクルを作成</Button>
            </Link>
          ) : undefined
        }
      />

      {/* サブナビゲーション */}
      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {subTabs.map((tab) => {
            const count =
              tab.value === "sheets"
                ? templates.length
                : tab.value === "cycles"
                  ? cycles.length
                  : undefined;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors flex items-center gap-1.5",
                  activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {TabIcon && <TabIcon className="h-4 w-4" />}
                {tab.label}
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground">{count}</span>
                )}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 評価シート一覧 */}
      {activeTab === "sheets" && (
        <div className="bg-white">
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
        </div>
      )}

      {/* 評価サイクル一覧 */}
      {activeTab === "cycles" && (
        <div className="bg-white">
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
        </div>
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
