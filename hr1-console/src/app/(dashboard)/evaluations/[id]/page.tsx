"use client";

import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
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
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { cn } from "@/lib/utils";
import { useEvaluationTemplateDetail } from "@/lib/hooks/use-evaluation-template-detail";
import { Trash2, SlidersHorizontal, X } from "lucide-react";
import {
  formTargetLabels,
  scoreTypeLabels,
  evaluationStatusLabels,
  evaluationStatusColors,
  cycleStatusLabels,
  cycleStatusColors,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { StatisticsView } from "@/features/evaluations/components/statistics-view";
import { ComparisonView } from "@/features/evaluations/components/comparison-view";

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
  base.push({ value: "audit", label: "変更ログ" });
  return base;
}

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "criteria", label: "評価項目" },
];

export default function EvaluationTemplateDetailPage() {
  const {
    id,
    router,
    organization,
    template,
    criteria,
    evaluations,
    cycles,
    loading,
    activeTab,
    setActiveTab,
    evalSearch,
    setEvalSearch,
    evalStatusFilter,
    setEvalStatusFilter,
    editing,
    setEditing,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editTarget,
    setEditTarget,
    editDescription,
    setEditDescription,
    editCriteria,
    saving,
    startEditing,
    addCriterion,
    removeCriterion,
    updateCriterion,
    handleSave,
  } = useEvaluationTemplateDetail();

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

      <StickyFilterBar>
        <TabBar
          tabs={getTabs(template.evaluation_type)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </StickyFilterBar>

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
              <SectionCard>
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
              </SectionCard>
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
              <SectionCard>
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
              </SectionCard>
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
