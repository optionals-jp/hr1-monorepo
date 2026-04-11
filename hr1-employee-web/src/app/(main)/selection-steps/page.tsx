"use client";

import { useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
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
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import {
  LayoutList,
  FileText,
  ClipboardList,
  MessageSquare,
  ExternalLink,
  Award,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { stepTypeLabels, StepType } from "@/lib/constants";
import {
  useSelectionStepsPage,
  TEMPLATE_TAB_ALL,
} from "@/features/recruiting/hooks/use-selection-steps-page";
import type { SelectionStepTemplate } from "@/types/database";

const typeTabs = [
  { value: TEMPLATE_TAB_ALL, label: "すべて", icon: LayoutList },
  { value: StepType.Screening, label: "書類選考", icon: FileText },
  { value: StepType.Form, label: "フォーム", icon: ClipboardList },
  { value: StepType.Interview, label: "面接", icon: MessageSquare },
  { value: StepType.ExternalTest, label: "外部テスト", icon: ExternalLink },
  { value: StepType.Offer, label: "内定", icon: Award },
];

export default function SelectionStepsPage() {
  const { showToast } = useToast();
  const h = useSelectionStepsPage();
  const [deleteTarget, setDeleteTarget] = useState<SelectionStepTemplate | null>(null);

  const onDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await h.handleDelete(deleteTarget.id);
    if (result.success) {
      showToast("選考ステップを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.error} onRetry={() => h.mutateTemplates()} />
      <PageHeader
        title="選考ステップ"
        description="求人で再利用できる選考ステップのマスタを管理"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={h.openAddDialog}>
            ステップを追加
          </Button>
        }
      />

      <StickyFilterBar>
        <TabBar tabs={typeTabs} activeTab={h.typeFilter} onTabChange={h.setTypeFilter} />
        <SearchBar value={h.search} onChange={h.setSearch} placeholder="ステップ名・説明で検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">順序</TableHead>
              <TableHead>ステップ名</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="text-right">進行中</TableHead>
              <TableHead className="text-right">完了</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {h.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : h.filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {h.templates.length === 0
                    ? "選考ステップがまだありません。「ステップを追加」から作成してください"
                    : "該当するステップがありません"}
                </TableCell>
              </TableRow>
            ) : (
              h.filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => h.openEditDialog(t)}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {t.sort_order}
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{stepTypeLabels[t.step_type] ?? t.step_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                    {t.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {t.inProgressCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {t.completedCount}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label="操作メニュー" />}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => h.openEditDialog(t)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(t)}
                          disabled={h.deletingId === t.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title={h.form.id ? "選考ステップを編集" : "選考ステップを追加"}
        onSave={async () => {
          const result = await h.handleSave();
          if (result.success) {
            showToast(h.form.id ? "選考ステップを更新しました" : "選考ステップを追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.form.name.trim()}
        saveLabel={h.form.id ? "更新" : "追加"}
      >
        <div className="space-y-4">
          <FormInput
            label="ステップ名"
            required
            value={h.form.name}
            onChange={(e) => h.setFormField("name", e.target.value)}
            placeholder="例: 1次面接"
            error={h.formErrors.name}
          />
          <FormField label="種別" required>
            <Select
              value={h.form.step_type}
              onValueChange={(v) => h.setFormField("step_type", v ?? "")}
            >
              <SelectTrigger>
                <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={StepType.Screening}>書類選考</SelectItem>
                <SelectItem value={StepType.Form}>フォーム</SelectItem>
                <SelectItem value={StepType.Interview}>面接</SelectItem>
                <SelectItem value={StepType.ExternalTest}>外部テスト</SelectItem>
                <SelectItem value={StepType.Offer}>内定</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormTextarea
            label="説明"
            value={h.form.description}
            onChange={(e) => h.setFormField("description", e.target.value)}
            placeholder="このステップの目的や運用メモ"
            rows={3}
          />
          <FormInput
            label="並び順"
            type="number"
            value={h.form.sort_order}
            onChange={(e) => h.setFormField("sort_order", e.target.value)}
            placeholder="0"
          />
        </div>
      </EditPanel>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="選考ステップの削除"
        description={
          deleteTarget ? `「${deleteTarget.name}」を削除します。この操作は取り消せません。` : ""
        }
        variant="destructive"
        confirmLabel="削除"
        onConfirm={onDeleteConfirm}
        loading={h.deletingId !== null}
      />
    </div>
  );
}
