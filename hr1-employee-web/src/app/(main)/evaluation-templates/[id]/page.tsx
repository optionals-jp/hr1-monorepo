"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  MoreVertical,
  Copy,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { scoreTypeLabels } from "@/lib/constants";
import {
  useEvaluationTemplateDetail,
  isNumericScoreType,
} from "@/lib/hooks/use-evaluation-template-detail";

const templateStatusLabels: Record<string, string> = {
  draft: "下書き",
  published: "公開中",
  archived: "アーカイブ",
};

const templateStatusVariant: Record<string, "default" | "outline" | "secondary"> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
};

export default function EvaluationTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const h = useEvaluationTemplateDetail(id);

  // テンプレート基本情報の編集フォーム
  const [metaEditOpen, setMetaEditOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);

  // 公開 / アーカイブ / 複製 / 削除(項目) の確認ダイアログ
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [deleteCriterionId, setDeleteCriterionId] = useState<string | null>(null);
  const [deletingCriterion, setDeletingCriterion] = useState(false);

  if (h.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.template) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        評価テンプレートが見つかりません
      </div>
    );
  }

  const template = h.template;
  const status = template.status;
  const statusLabel = templateStatusLabels[status] ?? status;
  const canEdit = !h.isArchived;

  const openMetaEdit = () => {
    setMetaTitle(template.title);
    setMetaDescription(template.description ?? "");
    setMetaEditOpen(true);
  };

  const saveMeta = async () => {
    if (!metaTitle.trim()) {
      showToast("タイトルを入力してください", "error");
      return;
    }
    setMetaSaving(true);
    const res = await h.updateTemplateMeta({
      title: metaTitle.trim(),
      description: metaDescription.trim() || null,
      evaluation_type: h.isDraft ? template.evaluation_type : undefined,
      anonymity_mode: h.isDraft ? template.anonymity_mode : undefined,
    });
    setMetaSaving(false);
    if (res.success) {
      showToast("テンプレートを更新しました");
      setMetaEditOpen(false);
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    const res = await h.publishTemplate();
    setPublishing(false);
    if (res.success) {
      showToast("テンプレートを公開しました");
      setPublishConfirmOpen(false);
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    const res = await h.archiveTemplate();
    setArchiving(false);
    if (res.success) {
      showToast("テンプレートをアーカイブしました");
      setArchiveConfirmOpen(false);
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTitle.trim()) {
      showToast("複製後のタイトルを入力してください", "error");
      return;
    }
    setDuplicating(true);
    const res = await h.duplicateTemplate(duplicateTitle.trim());
    setDuplicating(false);
    if (res.success && res.newId) {
      showToast("テンプレートを複製しました");
      setDuplicateOpen(false);
      router.push(`/evaluation-templates/${res.newId}`);
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  const confirmDeleteCriterion = async () => {
    if (!deleteCriterionId) return;
    setDeletingCriterion(true);
    const res = await h.deleteCriterion(deleteCriterionId);
    setDeletingCriterion(false);
    if (res.success) {
      showToast("評価項目を削除しました");
      setDeleteCriterionId(null);
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  const saveCriterion = async () => {
    const res = await h.saveCriterionDialog();
    if (res.success) {
      showToast("評価項目を保存しました");
    } else if (res.error) {
      showToast(res.error, "error");
    }
  };

  return (
    <>
      <PageHeader
        title={template.title}
        description={template.description ?? undefined}
        breadcrumb={[{ label: "評価テンプレート", href: "/evaluation-templates" }]}
        sticky={false}
        action={
          <div className="flex items-center gap-2">
            {h.isDraft && (
              <Button
                variant="primary"
                onClick={() => setPublishConfirmOpen(true)}
                disabled={h.criteria.length === 0}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                公開
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-input bg-background text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="その他の操作"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setDuplicateTitle(`${template.title} のコピー`);
                    setDuplicateOpen(true);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  複製
                </DropdownMenuItem>
                {!h.isArchived && (
                  <DropdownMenuItem onClick={() => setArchiveConfirmOpen(true)}>
                    <Archive className="mr-2 h-4 w-4" />
                    アーカイブ
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="max-w-3xl space-y-6">
          <SectionCard>
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-sm font-semibold">基本情報</h2>
              {canEdit && (
                <Button variant="ghost" size="xs" onClick={openMetaEdit}>
                  <Pencil className="mr-1 h-3 w-3" />
                  編集
                </Button>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground w-20 shrink-0">ステータス</span>
                <Badge variant={templateStatusVariant[status] ?? "outline"}>{statusLabel}</Badge>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-20 shrink-0">対象</span>
                <Badge variant="outline">候補者向け</Badge>
              </div>
              <div className="flex gap-8">
                <span className="text-muted-foreground w-20 shrink-0">作成日</span>
                <span>{format(new Date(template.created_at), "yyyy/MM/dd")}</span>
              </div>
            </div>
          </SectionCard>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                評価項目
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {h.criteria.length}
                </span>
              </h2>
              {canEdit && (
                <Button variant="outline" size="xs" onClick={h.openAddCriterionDialog}>
                  <Plus className="mr-1 h-3 w-3" />
                  項目を追加
                </Button>
              )}
            </div>
            {h.criteria.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm rounded-xl border border-dashed">
                評価項目がありません
              </p>
            ) : (
              <SectionCard>
                {h.criteria.map((c, index) => {
                  const criterionAnchors = h.anchors
                    .filter((a) => a.criterion_id === c.id)
                    .sort((a, b) => a.score_value - b.score_value);
                  return (
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
                        {criterionAnchors.length > 0 && (
                          <div className="pt-2 space-y-1">
                            {criterionAnchors.map((a) => (
                              <div key={a.id} className="flex gap-3 text-xs">
                                <span className="text-muted-foreground w-8 shrink-0 tabular-nums">
                                  {a.score_value}
                                </span>
                                <span className="whitespace-pre-wrap">{a.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => h.openEditCriterionDialog(c.id)}
                            aria-label="項目を編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteCriterionId(c.id)}
                            className="text-destructive hover:text-destructive"
                            aria-label="項目を削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </SectionCard>
            )}
            {h.isPublished && (
              <p className="text-xs text-muted-foreground mt-2">
                公開中のテンプレートです。評価方法の変更は過去データに影響するため制限されます。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 基本情報の編集ダイアログ */}
      <EditPanel
        open={metaEditOpen}
        onOpenChange={setMetaEditOpen}
        title="基本情報を編集"
        onSave={saveMeta}
        saving={metaSaving}
        saveDisabled={!metaTitle.trim()}
      >
        <div className="space-y-4">
          <FormField label="テンプレート名" required>
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
          </FormField>
          <FormField label="説明">
            <Textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
            />
          </FormField>
          {h.isPublished && (
            <p className="text-xs text-muted-foreground">
              公開中のため、タイトル・説明のみ編集できます。
            </p>
          )}
        </div>
      </EditPanel>

      {/* 評価項目の追加 / 編集ダイアログ */}
      <EditPanel
        open={h.dialogMode.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) h.closeDialog();
        }}
        title={h.dialogMode.kind === "edit" ? "評価項目を編集" : "評価項目を追加"}
        onSave={saveCriterion}
        saving={h.saving}
        saveDisabled={!h.draft?.label.trim()}
      >
        {h.draft && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="ラベル" required>
                <Input
                  value={h.draft.label}
                  onChange={(e) => h.updateDraftField("label", e.target.value)}
                  placeholder="コミュニケーション能力"
                />
              </FormField>
              <FormField label="評価方法">
                <Select
                  value={h.draft.score_type}
                  onValueChange={(v) => v && h.updateDraftField("score_type", v)}
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
                    value={h.draft.description}
                    onChange={(e) => h.updateDraftField("description", e.target.value)}
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
                  value={h.draft.weight}
                  onChange={(e) => h.updateDraftField("weight", e.target.value)}
                  placeholder="1.00"
                />
              </FormField>
            </div>

            {h.draft.score_type === "select" && (
              <FormField label="選択肢（1行に1つ）">
                <Textarea
                  value={h.draft.options}
                  onChange={(e) => h.updateDraftField("options", e.target.value)}
                  placeholder={"A: 優秀\nB: 良好\nC: 普通\nD: 要改善"}
                  rows={3}
                />
              </FormField>
            )}

            {isNumericScoreType(h.draft.score_type) && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => h.updateDraftField("showAnchors", !h.draft!.showAnchors)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      !h.draft.showAnchors && "-rotate-90"
                    )}
                  />
                  行動アンカー（各スコアの基準を定義）
                </button>
                {h.draft.showAnchors && (
                  <div className="space-y-2 pl-5 border-l-2 border-muted">
                    <p className="text-xs text-muted-foreground">
                      各スコアに対する具体的な行動基準を記述すると、評価者間のブレを軽減できます
                    </p>
                    {h.draft.anchors.map((anchor) => (
                      <div key={anchor.score_value} className="flex items-start gap-2">
                        <Label className="text-sm font-bold text-muted-foreground w-6 pt-2 text-right shrink-0">
                          {anchor.score_value}
                        </Label>
                        <Input
                          value={anchor.description}
                          onChange={(e) => h.updateDraftAnchor(anchor.score_value, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {h.isPublished && h.dialogMode.kind === "edit" && (
              <p className="text-xs text-muted-foreground">
                公開中のテンプレートでは、既に評価が行われた項目の評価方法は変更できません。
              </p>
            )}
          </div>
        )}
      </EditPanel>

      {/* 評価項目の削除確認 */}
      <ConfirmDialog
        open={deleteCriterionId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCriterionId(null);
        }}
        title="評価項目を削除"
        description="この評価項目を削除します。既に評価済みの場合は論理削除（過去データは保持）されます。"
        variant="destructive"
        confirmLabel="削除"
        onConfirm={confirmDeleteCriterion}
        loading={deletingCriterion}
      />

      {/* 公開確認 */}
      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title="テンプレートを公開"
        description="公開すると評価サイクルで利用できるようになります。公開後は破壊的な変更が制限されます。"
        confirmLabel="公開"
        onConfirm={handlePublish}
        loading={publishing}
      />

      {/* アーカイブ確認 */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="テンプレートをアーカイブ"
        description="アーカイブすると一覧に表示されなくなり、新しい評価サイクルで選択できなくなります。過去のデータは保持されます。"
        variant="destructive"
        confirmLabel="アーカイブ"
        onConfirm={handleArchive}
        loading={archiving}
      />

      {/* 複製ダイアログ */}
      <EditPanel
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="テンプレートを複製"
        onSave={handleDuplicate}
        saving={duplicating}
        saveDisabled={!duplicateTitle.trim()}
        saveLabel="複製"
      >
        <div className="space-y-4">
          <FormField label="複製後のタイトル" required>
            <Input value={duplicateTitle} onChange={(e) => setDuplicateTitle(e.target.value)} />
          </FormField>
          <p className="text-xs text-muted-foreground">
            評価項目とアンカー（行動基準）もコピーされます。複製後のテンプレートは下書き状態になります。
          </p>
        </div>
      </EditPanel>
    </>
  );
}
