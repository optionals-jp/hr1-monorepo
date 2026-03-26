"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrg } from "@/lib/org-context";
import type {
  EvaluationTemplate,
  EvaluationCriterion,
  EvaluationCycle,
  Evaluation,
  EvaluationScore,
} from "@/types/database";
import { Trash2, SlidersHorizontal, X, Star } from "lucide-react";
import {
  formTargetLabels,
  scoreTypeLabels,
  evaluationStatusLabels,
  evaluationStatusColors,
  cycleStatusLabels,
  cycleStatusColors,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

interface CriterionDraft {
  id: string;
  label: string;
  description: string;
  score_type: string;
  options: string;
  sort_order: number;
  isNew?: boolean;
}

function getTabs(evaluationType?: string) {
  const base = [
    { value: "criteria", label: "評価項目" },
    { value: "evaluations", label: "評価一覧" },
  ];
  if (evaluationType === "multi_rater") {
    base.push({ value: "cycles", label: "サイクル" });
  } else {
    base.push({ value: "statistics", label: "統計" }, { value: "comparison", label: "比較" });
  }
  base.push({ value: "audit", label: "変更履歴" });
  return base;
}

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "criteria", label: "評価項目" },
];

type EvalWithScores = Evaluation & {
  target_name: string;
  evaluator_name: string;
  scores: EvaluationScore[];
};

/** 統計ビュー：項目ごとの平均・分布・回答数 */
function StatisticsView({
  criteria,
  evaluations,
}: {
  criteria: EvaluationCriterion[];
  evaluations: EvalWithScores[];
}) {
  const submitted = evaluations.filter((e) => e.status === "submitted");

  if (submitted.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">提出済みの評価がありません</p>;
  }

  // Collect all scores grouped by criterion
  const allScores = submitted.flatMap((e) => e.scores);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 概要カード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">総評価数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{evaluations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              提出済み {submitted.length} / 下書き {evaluations.length - submitted.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">対象者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(submitted.map((e) => e.target_user_id)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">評価者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(submitted.map((e) => e.evaluator_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 項目ごとの統計 */}
      {criteria.map((c) => {
        const criterionScores = allScores.filter((s) => s.criterion_id === c.id);

        if (c.score_type === "five_star" || c.score_type === "ten_point") {
          const numericScores = criterionScores
            .map((s) => s.score)
            .filter((s): s is number => s !== null);
          const avg =
            numericScores.length > 0
              ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
              : 0;
          const max = c.score_type === "five_star" ? 5 : 10;

          // Distribution
          const dist = new Map<number, number>();
          for (let i = 1; i <= max; i++) dist.set(i, 0);
          for (const s of numericScores) {
            dist.set(s, (dist.get(s) ?? 0) + 1);
          }
          const maxCount = Math.max(...dist.values(), 1);

          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {scoreTypeLabels[c.score_type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">
                    {numericScores.length > 0 ? avg.toFixed(1) : "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    / {max}
                    <span className="ml-2">（{numericScores.length}件）</span>
                  </div>
                  {c.score_type === "five_star" && numericScores.length > 0 && (
                    <div className="flex gap-0.5 ml-auto">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            "h-5 w-5",
                            n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* 分布バー */}
                <div className="space-y-1">
                  {Array.from(dist.entries())
                    .sort(([a], [b]) => b - a)
                    .map(([score, count]) => (
                      <div key={score} className="flex items-center gap-2 text-sm">
                        <span className="w-6 text-right text-muted-foreground">{score}</span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (c.score_type === "select" && c.options) {
          // 選択肢の分布
          const valueCounts = new Map<string, number>();
          for (const opt of c.options) valueCounts.set(opt, 0);
          for (const s of criterionScores) {
            if (s.value) valueCounts.set(s.value, (valueCounts.get(s.value) ?? 0) + 1);
          }
          const total = criterionScores.filter((s) => s.value).length;
          const maxCount = Math.max(...valueCounts.values(), 1);

          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {scoreTypeLabels[c.score_type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">回答数: {total}件</p>
                <div className="space-y-1">
                  {Array.from(valueCounts.entries()).map(([opt, count]) => (
                    <div key={opt} className="flex items-center gap-2 text-sm">
                      <span className="w-24 truncate text-muted-foreground">{opt}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        // text type
        const textResponses = criterionScores.filter((s) => s.value);
        return (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{c.label}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {scoreTypeLabels[c.score_type]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">回答数: {textResponses.length}件</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** 比較ビュー：行=評価項目、列=評価対象者で横並び比較 */
function ComparisonView({
  criteria,
  evaluations,
}: {
  criteria: EvaluationCriterion[];
  evaluations: EvalWithScores[];
}) {
  const submitted = evaluations.filter((e) => e.status === "submitted");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Default: show all submitted (up to 6)
  const toCompare =
    selectedIds.length > 0
      ? submitted.filter((e) => selectedIds.includes(e.id))
      : submitted.slice(0, 6);

  if (submitted.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">提出済みの評価がありません</p>;
  }

  const toggleSelect = (evalId: string) => {
    setSelectedIds((prev) =>
      prev.includes(evalId) ? prev.filter((id) => id !== evalId) : [...prev, evalId]
    );
  };

  return (
    <div className="space-y-4">
      {/* 評価選択 */}
      {submitted.length > 6 && (
        <div className="space-y-2">
          <Label className="text-sm">比較する評価を選択（最大6件）</Label>
          <div className="flex flex-wrap gap-2">
            {submitted.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggleSelect(ev.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md border text-sm transition-colors",
                  (selectedIds.length === 0 ? toCompare : submitted)
                    .filter((e) =>
                      selectedIds.length > 0 ? selectedIds.includes(e.id) : toCompare.includes(e)
                    )
                    .some((e) => e.id === ev.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:bg-muted"
                )}
                disabled={selectedIds.length >= 6 && !selectedIds.includes(ev.id)}
              >
                {ev.target_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 比較テーブル */}
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 min-w-40">
                評価項目
              </th>
              {toCompare.map((ev) => (
                <th key={ev.id} className="p-3 font-medium text-center min-w-35">
                  <div>{ev.target_name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {ev.evaluator_name}
                  </div>
                </th>
              ))}
              {toCompare.length > 1 &&
                criteria.some(
                  (c) => c.score_type === "five_star" || c.score_type === "ten_point"
                ) && <th className="p-3 font-medium text-center min-w-25 bg-muted/30">平均</th>}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => {
              const isNumeric = c.score_type === "five_star" || c.score_type === "ten_point";
              const numericScores: number[] = [];

              return (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="p-3 font-medium sticky left-0 bg-white">
                    <div>{c.label}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {scoreTypeLabels[c.score_type]}
                    </div>
                  </td>
                  {toCompare.map((ev) => {
                    const score = ev.scores.find((s) => s.criterion_id === c.id);

                    if (isNumeric && score?.score != null) {
                      numericScores.push(score.score);
                    }

                    return (
                      <td key={ev.id} className="p-3 text-center">
                        {c.score_type === "five_star" && score?.score != null ? (
                          <div className="flex justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={cn(
                                  "h-4 w-4",
                                  n <= score.score!
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-200"
                                )}
                              />
                            ))}
                          </div>
                        ) : c.score_type === "ten_point" && score?.score != null ? (
                          <span className="font-semibold">{score.score}/10</span>
                        ) : c.score_type === "select" && score?.value ? (
                          <Badge variant="secondary">{score.value}</Badge>
                        ) : c.score_type === "text" && score?.value ? (
                          <span className="text-left block text-xs">{score.value}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {score?.comment && (
                          <p className="text-xs text-muted-foreground mt-1">{score.comment}</p>
                        )}
                      </td>
                    );
                  })}
                  {toCompare.length > 1 &&
                    criteria.some(
                      (cr) => cr.score_type === "five_star" || cr.score_type === "ten_point"
                    ) && (
                      <td className="p-3 text-center bg-muted/30">
                        {isNumeric && numericScores.length > 0 ? (
                          <span className="font-semibold">
                            {(
                              numericScores.reduce((a, b) => a + b, 0) / numericScores.length
                            ).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                </tr>
              );
            })}
            {/* 総合コメント行 */}
            <tr className="border-t-2">
              <td className="p-3 font-medium sticky left-0 bg-white">総合コメント</td>
              {toCompare.map((ev) => (
                <td key={ev.id} className="p-3 text-xs">
                  {ev.overall_comment ?? <span className="text-muted-foreground">-</span>}
                </td>
              ))}
              {toCompare.length > 1 &&
                criteria.some(
                  (c) => c.score_type === "five_star" || c.score_type === "ten_point"
                ) && <td className="p-3 bg-muted/30" />}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EvaluationTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [evaluations, setEvaluations] = useState<
    (Evaluation & { target_name: string; evaluator_name: string; scores: EvaluationScore[] })[]
  >([]);
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("criteria");

  // Search & filter states for evaluations tab
  const [evalSearch, setEvalSearch] = useState("");
  const [evalStatusFilter, setEvalStatusFilter] = useState<string>("all");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState<string>("both");
  const [editDescription, setEditDescription] = useState("");
  const [editCriteria, setEditCriteria] = useState<CriterionDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const [{ data: tplData }, { data: crData }, { data: evalData }] = await Promise.all([
      getSupabase()
        .from("evaluation_templates")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single(),
      getSupabase()
        .from("evaluation_criteria")
        .select("*")
        .eq("template_id", id)
        .order("sort_order"),
      getSupabase()
        .from("evaluations")
        .select("*")
        .eq("template_id", id)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
    ]);

    setTemplate(tplData);
    setCriteria(crData ?? []);

    // Fetch profile names and scores for evaluations
    if (evalData && evalData.length > 0) {
      const userIds = [...new Set(evalData.flatMap((e) => [e.target_user_id, e.evaluator_id]))];
      const evalIds = evalData.map((e) => e.id);

      const [{ data: profiles }, { data: scoreData }] = await Promise.all([
        getSupabase().from("profiles").select("id, display_name, email").in("id", userIds),
        getSupabase().from("evaluation_scores").select("*").in("evaluation_id", evalIds),
      ]);

      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.display_name ?? p.email);
      }

      setEvaluations(
        evalData.map((e) => ({
          ...e,
          target_name: nameMap.get(e.target_user_id) ?? e.target_user_id,
          evaluator_name: nameMap.get(e.evaluator_id) ?? e.evaluator_id,
          scores: (scoreData ?? []).filter((s) => s.evaluation_id === e.id),
        }))
      );
    } else {
      setEvaluations([]);
    }

    // サイクル取得（多面評価シートの場合）
    const { data: cycleData } = await getSupabase()
      .from("evaluation_cycles")
      .select("*")
      .eq("template_id", id)
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });
    setCycles(cycleData ?? []);

    setLoading(false);
  }

  function startEditing() {
    if (!template) return;
    setEditTitle(template.title);
    setEditTarget(template.target ?? "both");
    setEditDescription(template.description ?? "");
    setEditCriteria(
      criteria.map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description ?? "",
        score_type: c.score_type,
        options: c.options?.join("\n") ?? "",
        sort_order: c.sort_order,
      }))
    );
    setEditTab("basic");
    setEditing(true);
  }

  function addCriterion() {
    const maxOrder =
      editCriteria.length > 0 ? Math.max(...editCriteria.map((c) => c.sort_order)) : 0;
    setEditCriteria([
      ...editCriteria,
      {
        id: `new-${Date.now()}`,
        label: "",
        description: "",
        score_type: "five_star",
        options: "",
        sort_order: maxOrder + 1,
        isNew: true,
      },
    ]);
  }

  function removeCriterion(criterionId: string) {
    setEditCriteria(editCriteria.filter((c) => c.id !== criterionId));
  }

  function updateCriterion(criterionId: string, key: string, value: string) {
    setEditCriteria(editCriteria.map((c) => (c.id === criterionId ? { ...c, [key]: value } : c)));
  }

  async function handleSave() {
    if (!template) return;
    setSaving(true);

    // 1. Update template
    if (
      editTitle !== template.title ||
      editTarget !== template.target ||
      editDescription !== (template.description ?? "")
    ) {
      await getSupabase()
        .from("evaluation_templates")
        .update({
          title: editTitle,
          target: editTarget,
          description: editDescription || null,
        })
        .eq("id", template.id);
    }

    // 2. Handle criteria changes
    const existingIds = criteria.map((c) => c.id);
    const editIds = editCriteria.filter((c) => !c.isNew).map((c) => c.id);

    // Deleted
    const deletedIds = existingIds.filter((cid) => !editIds.includes(cid));
    if (deletedIds.length > 0) {
      await getSupabase().from("evaluation_criteria").delete().in("id", deletedIds);
    }

    // New
    const newCriteria = editCriteria.filter((c) => c.isNew);
    if (newCriteria.length > 0) {
      await getSupabase()
        .from("evaluation_criteria")
        .insert(
          newCriteria.map((c, i) => ({
            id: `evalcr-${template.id}-${Date.now()}-${i}`,
            template_id: template.id,
            label: c.label,
            description: c.description || null,
            score_type: c.score_type,
            options:
              c.options && c.score_type === "select" ? c.options.split("\n").filter(Boolean) : null,
            sort_order: c.sort_order,
          }))
        );
    }

    // Updated
    for (const ec of editCriteria.filter((c) => !c.isNew && existingIds.includes(c.id))) {
      const original = criteria.find((c) => c.id === ec.id);
      if (!original) continue;
      const changed =
        ec.label !== original.label ||
        ec.score_type !== original.score_type ||
        ec.description !== (original.description ?? "") ||
        ec.options !== (original.options?.join("\n") ?? "");

      if (changed) {
        await getSupabase()
          .from("evaluation_criteria")
          .update({
            label: ec.label,
            description: ec.description || null,
            score_type: ec.score_type,
            options:
              ec.options && ec.score_type === "select"
                ? ec.options.split("\n").filter(Boolean)
                : null,
            sort_order: ec.sort_order,
          })
          .eq("id", ec.id);
      }
    }

    setSaving(false);
    setEditing(false);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        評価シートが見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={template.title}
        description={template.description ?? undefined}
        breadcrumb={[{ label: "評価管理", href: "/evaluations" }]}
        sticky={false}
        action={
          <Badge variant="outline">{formTargetLabels[template.target] ?? template.target}</Badge>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {getTabs(template.evaluation_type).map((tab) => {
            const count =
              tab.value === "criteria"
                ? criteria.length
                : tab.value === "evaluations"
                  ? evaluations.length
                  : tab.value === "cycles"
                    ? cycles.length
                    : undefined;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                  activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                )}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* ===== 評価項目タブ ===== */}
        {activeTab === "criteria" && (
          <div className="max-w-3xl">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={startEditing}>
                編集
              </Button>
            </div>
            {criteria.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">評価項目がありません</p>
            ) : (
              <div className="rounded-lg bg-white border">
                {criteria.map((c, index) => (
                  <div key={c.id} className="flex items-start gap-4 px-5 py-4">
                    <span className="text-sm font-bold text-muted-foreground w-6 pt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.label}</p>
                        <Badge variant="outline" className="text-xs">
                          {scoreTypeLabels[c.score_type] ?? c.score_type}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                      )}
                      {c.options && c.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {c.options.map((opt, i) => (
                            <Badge key={i} variant="secondary">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== 評価一覧タブ ===== */}
        {activeTab === "evaluations" && (
          <>
            {evaluations.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">まだ評価がありません</p>
            ) : (
              <>
                <SearchBar value={evalSearch} onChange={setEvalSearch} />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
                    {evalStatusFilter !== "all" && (
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                          ステータス：{evaluationStatusLabels[evalStatusFilter] ?? evalStatusFilter}
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvalStatusFilter("all");
                            }}
                            className="ml-0.5 hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      </div>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-auto py-2">
                    <DropdownMenuItem className="py-2" onClick={() => setEvalStatusFilter("all")}>
                      <span className={cn(evalStatusFilter === "all" && "font-medium")}>
                        すべて
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {Object.entries(evaluationStatusLabels).map(([key, label]) => (
                      <DropdownMenuItem
                        key={key}
                        className="py-2"
                        onClick={() => setEvalStatusFilter(key)}
                      >
                        <span className={cn(evalStatusFilter === key && "font-medium")}>
                          {label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="overflow-x-auto bg-white rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>対象者</TableHead>
                        <TableHead>評価者</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>評価日</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations
                        .filter((ev) => {
                          const matchesSearch =
                            !evalSearch ||
                            ev.target_name.toLowerCase().includes(evalSearch.toLowerCase()) ||
                            ev.evaluator_name.toLowerCase().includes(evalSearch.toLowerCase());
                          const matchesStatus =
                            evalStatusFilter === "all" || ev.status === evalStatusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((ev) => (
                          <TableRow key={ev.id}>
                            <TableCell className="font-medium">{ev.target_name}</TableCell>
                            <TableCell>{ev.evaluator_name}</TableCell>
                            <TableCell>
                              <Badge variant={evaluationStatusColors[ev.status]}>
                                {evaluationStatusLabels[ev.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
        {/* ===== 統計タブ ===== */}
        {activeTab === "statistics" && (
          <StatisticsView criteria={criteria} evaluations={evaluations} />
        )}

        {/* ===== 比較タブ ===== */}
        {activeTab === "comparison" && (
          <ComparisonView criteria={criteria} evaluations={evaluations} />
        )}

        {/* ===== サイクルタブ（多面評価用） ===== */}
        {activeTab === "cycles" && (
          <div className="max-w-3xl space-y-4">
            {cycles.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">この評価シートのサイクルはありません</p>
                <p className="text-sm text-muted-foreground">
                  サイクルを作成して多面評価を開始しましょう
                </p>
                <Button onClick={() => router.push("/evaluations/cycles/new")}>
                  サイクルを作成
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-white border divide-y">
                {cycles.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/evaluations/cycles/${cycle.id}`)}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{cycle.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(cycle.start_date), "yyyy/MM/dd")} 〜{" "}
                        {format(new Date(cycle.end_date), "yyyy/MM/dd")}
                      </p>
                    </div>
                    <Badge variant={cycleStatusColors[cycle.status]}>
                      {cycleStatusLabels[cycle.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "audit" && organization && (
          <AuditLogPanel
            organizationId={organization.id}
            tableName="evaluation_templates"
            recordId={id}
          />
        )}
      </div>

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="評価シートを編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!editTitle}
      >
        {editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>評価シート名 *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="評価シート名"
              />
            </div>
            <div className="space-y-2">
              <Label>対象 *</Label>
              <Select value={editTarget} onValueChange={(v) => v && setEditTarget(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => formTargetLabels[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formTargetLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="評価シートの説明"
                rows={3}
              />
            </div>
          </div>
        )}
        {editTab === "criteria" && (
          <div className="space-y-4">
            {editCriteria.map((c, index) => (
              <div key={c.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    項目 {index + 1}
                    {c.isNew && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        新規
                      </Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCriterion(c.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ラベル *</Label>
                    <Input
                      value={c.label}
                      onChange={(e) => updateCriterion(c.id, "label", e.target.value)}
                      placeholder="コミュニケーション能力"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">評価方法</Label>
                    <Select
                      value={c.score_type}
                      onValueChange={(v) => v && updateCriterion(c.id, "score_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue>{(v: string) => scoreTypeLabels[v] ?? v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(scoreTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">説明</Label>
                  <Input
                    value={c.description}
                    onChange={(e) => updateCriterion(c.id, "description", e.target.value)}
                    placeholder="評価の観点や基準"
                  />
                </div>
                {c.score_type === "select" && (
                  <div className="space-y-1">
                    <Label className="text-xs">選択肢（1行に1つ）</Label>
                    <Textarea
                      value={c.options}
                      onChange={(e) => updateCriterion(c.id, "options", e.target.value)}
                      placeholder={"A: 優秀\nB: 良好\nC: 普通\nD: 要改善"}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addCriterion} className="w-full">
              評価項目を追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
