"use client";

import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ChevronDown } from "lucide-react";
import { useCreateEvaluation } from "@/lib/hooks/use-evaluations";
import {
  formTargetLabels,
  scoreTypeLabels,
  evaluationTypeLabels,
  anonymityModeLabels,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function NewEvaluationTemplatePage() {
  const {
    title,
    setTitle,
    target,
    setTarget,
    evaluationType,
    setEvaluationType,
    anonymityMode,
    setAnonymityMode,
    description,
    setDescription,
    criteria,
    saving,
    addCriterion,
    removeCriterion,
    updateCriterion,
    updateAnchor,
    handleSubmit,
    cancel,
  } = useCreateEvaluation();

  const isNumericType = (type: string) => type === "five_star" || type === "ten_point";

  return (
    <>
      <PageHeader
        title="評価シートを作成"
        breadcrumb={[{ label: "評価管理", href: "/evaluations" }]}
      />

      <PageContent>
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>評価シート名 *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="面接評価シート"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>対象 *</Label>
                  <Select value={target} onValueChange={(v) => v && setTarget(v)}>
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
                  <Label>評価タイプ *</Label>
                  <Select value={evaluationType} onValueChange={(v) => v && setEvaluationType(v)}>
                    <SelectTrigger>
                      <SelectValue>{(v: string) => evaluationTypeLabels[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(evaluationTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {evaluationType === "multi_rater" && (
                <div className="space-y-2">
                  <Label>匿名設定</Label>
                  <Select value={anonymityMode} onValueChange={(v) => v && setAnonymityMode(v)}>
                    <SelectTrigger>
                      <SelectValue>{(v: string) => anonymityModeLabels[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(anonymityModeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    匿名設定により、同僚・部下からの率直なフィードバックを促進します
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>説明</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="評価シートの説明"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>評価項目</CardTitle>
              <Button variant="outline" size="sm" onClick={addCriterion}>
                追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {criteria.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  評価項目を追加してください
                </p>
              ) : (
                criteria.map((c, index) => (
                  <div key={c.tempId} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        項目 {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCriterion(c.tempId)}
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
                          onChange={(e) => updateCriterion(c.tempId, "label", e.target.value)}
                          placeholder="コミュニケーション能力"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">評価方法</Label>
                        <Select
                          value={c.score_type}
                          onValueChange={(v) => v && updateCriterion(c.tempId, "score_type", v)}
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">説明</Label>
                        <Input
                          value={c.description}
                          onChange={(e) => updateCriterion(c.tempId, "description", e.target.value)}
                          placeholder="評価の観点や基準"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">重み</Label>
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={c.weight}
                          onChange={(e) => updateCriterion(c.tempId, "weight", e.target.value)}
                          placeholder="1.00"
                        />
                      </div>
                    </div>
                    {c.score_type === "select" && (
                      <div className="space-y-1">
                        <Label className="text-xs">選択肢（1行に1つ）</Label>
                        <Textarea
                          value={c.options}
                          onChange={(e) => updateCriterion(c.tempId, "options", e.target.value)}
                          placeholder={"A: 優秀\nB: 良好\nC: 普通\nD: 要改善"}
                          rows={3}
                        />
                      </div>
                    )}
                    {isNumericType(c.score_type) && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => updateCriterion(c.tempId, "showAnchors", !c.showAnchors)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              !c.showAnchors && "-rotate-90"
                            )}
                          />
                          行動アンカー（各スコアの基準を定義）
                        </button>
                        {c.showAnchors && (
                          <div className="space-y-2 pl-5 border-l-2 border-muted">
                            <p className="text-xs text-muted-foreground">
                              各スコアに対する具体的な行動基準を記述すると、評価者間のブレを軽減できます
                            </p>
                            {c.anchors.map((anchor) => (
                              <div key={anchor.score_value} className="flex items-start gap-2">
                                <span className="text-sm font-bold text-muted-foreground w-6 pt-2 text-right shrink-0">
                                  {anchor.score_value}
                                </span>
                                <Input
                                  value={anchor.description}
                                  onChange={(e) =>
                                    updateAnchor(c.tempId, anchor.score_value, e.target.value)
                                  }
                                  placeholder={
                                    anchor.score_value === 1
                                      ? "期待を大きく下回る"
                                      : anchor.score_value ===
                                          (c.score_type === "five_star" ? 3 : 5)
                                        ? "期待通り"
                                        : anchor.score_value ===
                                            (c.score_type === "five_star" ? 5 : 10)
                                          ? "卓越している"
                                          : ""
                                  }
                                  className="text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={cancel}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={!title || saving}>
              {saving ? "作成中..." : "評価シートを作成"}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
