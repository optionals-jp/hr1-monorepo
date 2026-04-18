"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
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
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { cn } from "@hr1/shared-ui/lib/utils";
import { MoreVertical, Pencil, Trash2, SlidersHorizontal, X } from "lucide-react";
import { useSelectionStepsPage } from "@/features/recruiting/hooks/use-selection-steps-page";
import type { SelectionFlow } from "@/types/database";

export default function SelectionStepsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useSelectionStepsPage();
  const [deleteFlowTarget, setDeleteFlowTarget] = useState<SelectionFlow | null>(null);

  const onDeleteFlowConfirm = async () => {
    if (!deleteFlowTarget) return;
    const result = await h.handleFlowDelete(deleteFlowTarget.id);
    if (result.success) {
      showToast("選考フローを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
    setDeleteFlowTarget(null);
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner
        error={h.error}
        onRetry={() => {
          h.mutateFlows();
          h.mutateTemplates();
        }}
      />
      <PageHeader
        title="選考ステップ"
        description="選考フローと各ステップのマスタを管理"
        sticky={false}
        border={false}
        action={
          <Button variant="primary" onClick={h.openAddFlowDialog}>
            フローを追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar value={h.search} onChange={h.setSearch} placeholder="フロー名・説明で検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {h.filterStepCount !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  ステップ：
                  {h.filterStepCount === "with" ? "あり" : "なし"}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      h.setFilterStepCount("all");
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
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">ステップ数</div>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterStepCount("all")}>
              <span className={cn(h.filterStepCount === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterStepCount("with")}>
              <span className={cn(h.filterStepCount === "with" && "font-medium")}>
                ステップあり
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterStepCount("without")}>
              <span className={cn(h.filterStepCount === "without" && "font-medium")}>
                ステップなし
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>フロー名</TableHead>
              <TableHead>説明</TableHead>
              <TableHead className="text-right">ステップ数</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={h.isLoading}
              isEmpty={h.filteredFlows.length === 0}
              emptyMessage="選考フローがまだありません。「フローを追加」から作成してください"
            >
              {h.filteredFlows.map((flow) => (
                <TableRow
                  key={flow.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/selection-steps/${flow.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">{flow.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {flow.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{flow.steps.length}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label="操作メニュー" />}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => h.openEditFlowDialog(flow)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteFlowTarget(flow)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* フロー追加/編集パネル */}
      <EditPanel
        open={h.flowDialogOpen}
        onOpenChange={h.setFlowDialogOpen}
        title={h.flowForm.id ? "選考フローを編集" : "選考フローを追加"}
        onSave={async () => {
          const result = await h.handleFlowSave();
          if (result.success) {
            showToast(h.flowForm.id ? "選考フローを更新しました" : "選考フローを追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.flowSaving}
        saveDisabled={!h.flowForm.name.trim()}
        saveLabel={h.flowForm.id ? "更新" : "追加"}
      >
        <div className="space-y-4">
          <FormInput
            label="フロー名"
            required
            value={h.flowForm.name}
            onChange={(e) => h.setFlowFormField("name", e.target.value)}
            placeholder="例: エンジニア採用フロー"
            error={h.flowFormErrors.name}
          />
          <FormTextarea
            label="説明"
            value={h.flowForm.description}
            onChange={(e) => h.setFlowFormField("description", e.target.value)}
            placeholder="このフローの用途や対象ポジション"
            rows={3}
          />
        </div>
      </EditPanel>

      {/* フロー削除確認 */}
      <ConfirmDialog
        open={deleteFlowTarget !== null}
        onOpenChange={(open) => !open && setDeleteFlowTarget(null)}
        title="選考フローの削除"
        description={
          deleteFlowTarget
            ? `「${deleteFlowTarget.name}」とその配下の全ステップを削除します。この操作は取り消せません。`
            : ""
        }
        variant="destructive"
        confirmLabel="削除"
        onConfirm={onDeleteFlowConfirm}
        loading={h.flowDeletingId !== null}
      />
    </div>
  );
}
