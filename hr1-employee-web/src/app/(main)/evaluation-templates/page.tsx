"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
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
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormField } from "@hr1/shared-ui/components/ui/form-field";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Trash2, ChevronDown, Plus } from "lucide-react";
import { scoreTypeLabels } from "@/lib/constants";
import {
  useEvaluationSheetsPage,
  isNumericScoreType,
} from "@/lib/hooks/use-evaluation-sheets-page";

export default function EvaluationSheetsPage() {
  const { showToast } = useToast();
  const h = useEvaluationSheetsPage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 他画面から ?new=1 で遷移してきた場合は作成ダイアログを自動で開く
  const openAddDialog = h.openAddDialog;
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openAddDialog();
      router.replace("/evaluation-templates");
    }
  }, [searchParams, openAddDialog, router]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="評価テンプレート"
        description="評価する項目・基準・配点を定義するマスタ。評価サイクルで選択して使用します"
        sticky={false}
        action={
          <Button variant="primary" onClick={h.openAddDialog}>
            テンプレートを作成
          </Button>
        }
      />

      <QueryErrorBanner error={h.error} onRetry={() => h.mutate()} />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={h.isLoading}
              isEmpty={h.templates.length === 0}
              emptyMessage="評価テンプレートがありません。右上の「テンプレートを作成」から追加してください"
            >
              {h.templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">候補者向け</Badge>
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
      </TableSection>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="評価テンプレートを作成"
        onSave={async () => {
          const result = await h.handleSave();
          if (result.success) {
            showToast("評価テンプレートを作成しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.title.trim()}
        saveLabel="作成"
      >
        <div className="space-y-5">
          {/* 基本情報 */}
          <div className="space-y-4">
            <FormField label="テンプレート名" required>
              <Input
                value={h.title}
                onChange={(e) => h.setTitle(e.target.value)}
                placeholder="面接評価テンプレート"
              />
            </FormField>
            <FormField label="説明">
              <Textarea
                value={h.description}
                onChange={(e) => h.setDescription(e.target.value)}
                placeholder="このテンプレートで評価する目的や運用メモ"
                rows={3}
              />
            </FormField>
            <p className="text-xs text-muted-foreground">
              このテンプレートは「候補者」を対象にした評価で利用できます。
            </p>
          </div>

          {/* 評価項目 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">評価項目</span>
              <Button variant="outline" size="xs" onClick={h.addCriterion}>
                <Plus className="mr-1 h-3 w-3" />
                項目を追加
              </Button>
            </div>

            {h.criteria.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-dashed">
                評価項目を追加してください
              </p>
            ) : (
              <div className="space-y-3">
                {h.criteria.map((c, index) => (
                  <div key={c.tempId} className="rounded-xl border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        項目 {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => h.removeCriterion(c.tempId)}
                        className="text-destructive hover:text-destructive"
                        aria-label="項目を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="ラベル" required>
                        <Input
                          value={c.label}
                          onChange={(e) => h.updateCriterion(c.tempId, "label", e.target.value)}
                          placeholder="コミュニケーション能力"
                        />
                      </FormField>
                      <FormField label="評価方法">
                        <Select
                          value={c.score_type}
                          onValueChange={(v) => v && h.updateCriterion(c.tempId, "score_type", v)}
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
                      </FormField>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <FormField label="説明">
                          <Input
                            value={c.description}
                            onChange={(e) =>
                              h.updateCriterion(c.tempId, "description", e.target.value)
                            }
                            placeholder="評価の観点や基準"
                          />
                        </FormField>
                      </div>
                      <FormField label="重み">
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={c.weight}
                          onChange={(e) => h.updateCriterion(c.tempId, "weight", e.target.value)}
                          placeholder="1.00"
                        />
                      </FormField>
                    </div>

                    {c.score_type === "select" && (
                      <FormField label="選択肢（1行に1つ）">
                        <Textarea
                          value={c.options}
                          onChange={(e) => h.updateCriterion(c.tempId, "options", e.target.value)}
                          placeholder={"A: 優秀\nB: 良好\nC: 普通\nD: 要改善"}
                          rows={3}
                        />
                      </FormField>
                    )}

                    {isNumericScoreType(c.score_type) && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => h.updateCriterion(c.tempId, "showAnchors", !c.showAnchors)}
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
                                <Label className="text-sm font-bold text-muted-foreground w-6 pt-2 text-right shrink-0">
                                  {anchor.score_value}
                                </Label>
                                <Input
                                  value={anchor.description}
                                  onChange={(e) =>
                                    h.updateAnchor(c.tempId, anchor.score_value, e.target.value)
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
                ))}
              </div>
            )}
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
