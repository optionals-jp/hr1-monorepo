"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useCrmDealsPage, useCrmCompanies, useCrmContacts, removeDeal } from "@/lib/hooks/use-crm";
import { DealKanban } from "@/components/crm/deal-kanban";
import { getSupabase } from "@/lib/supabase/browser";
import { updateDeal } from "@/lib/repositories/crm-repository";
import { useOrg } from "@/lib/org-context";
import { fireTrigger } from "@/lib/automation/engine";
import { usePipelines, getStagesFromPipeline, resolveStageLabel } from "@/lib/hooks/use-pipelines";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@hr1/shared-ui/lib/utils";
import type { CrmSavedViewConfig } from "@/types/database";
import { LayoutList, Kanban, SlidersHorizontal, X, Trash2 } from "lucide-react";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { DealEditPanel } from "./deal-edit-panel";

type ViewMode = "table" | "kanban";

export default function CrmDealsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { organization } = useOrg();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    deals,
    error,
    filtered,
    openCreate: openCreateBase,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  } = useCrmDealsPage();

  const { data: companies } = useCrmCompanies();
  const { data: contacts } = useCrmContacts();
  const { data: pipelines } = usePipelines();
  const defaultPipeline = pipelines?.find((p) => p.is_default) ?? pipelines?.[0] ?? null;

  // カンバン用パイプライン選択
  const [kanbanPipelineId, setKanbanPipelineId] = useState<string | null>(null);
  const kanbanPipeline = pipelines?.find((p) => p.id === kanbanPipelineId) ?? defaultPipeline;
  const kanbanStages = getStagesFromPipeline(kanbanPipeline);

  const openCreate = () => {
    openCreateBase();
    if (defaultPipeline) {
      const firstStage = getStagesFromPipeline(defaultPipeline)[0];
      setEditData((p) => ({
        ...p,
        pipeline_id: defaultPipeline.id,
        stage_id: firstStage?.id ?? undefined,
      }));
    }
  };

  // 保存ビュー
  const [viewConfig, setViewConfig] = useState<CrmSavedViewConfig>({});

  const DEAL_AVAILABLE_FIELDS = useMemo(
    () => [
      { key: "title", label: "商談名" },
      { key: "stage_id", label: "ステージ" },
      { key: "status", label: "ステータス" },
      { key: "probability", label: "確度" },
      { key: "amount", label: "金額" },
      { key: "expected_close_date", label: "見込み日" },
    ],
    []
  );

  // ビューのフィルタ・ソートを適用
  const viewFiltered = useMemo(() => {
    let result = filtered as unknown as Record<string, unknown>[];
    if (viewConfig.filters && viewConfig.filters.length > 0) {
      result = applyFilters(result, viewConfig.filters);
    }
    if (viewConfig.sort) {
      result = applySort(result, viewConfig.sort);
    }
    return result as unknown as typeof filtered;
  }, [filtered, viewConfig.filters, viewConfig.sort]);

  const { page, pageSize, totalCount, paginatedItems, onPageChange, onPageSizeChange } =
    usePagination(viewFiltered);
  const bulk = useBulkSelection(paginatedItems);

  const handleBulkDelete = async (ids: string[]) => {
    if (!organization) return;
    for (const id of ids) {
      await removeDeal(id, organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件の商談を削除しました`);
  };

  const handleStageChange = async (dealId: string, newStageId: string, newProbability: number) => {
    if (!organization) return;
    // 楽観的更新: UI を先に更新し、失敗時にリバート
    const previousDeals = deals;
    mutate(
      deals?.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage_id: newStageId,
              probability: newProbability,
            }
          : d
      ),
      false
    );
    try {
      await updateDeal(getSupabase(), dealId, organization.id, {
        stage_id: newStageId,
        probability: newProbability,
      });
      // ステージ変更トリガー（非同期）
      const deal = deals?.find((d) => d.id === dealId);
      if (deal) {
        fireTrigger(getSupabase(), {
          organizationId: organization.id,
          triggerType: "deal_stage_changed",
          entityType: "deal",
          entityId: dealId,
          entityData: {
            ...deal,
            stage_id: newStageId,
          } as unknown as Record<string, unknown>,
        }).catch(() => {});
      }
      mutate();
    } catch {
      mutate(previousDeals, false);
      showToast("ステージの更新に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="商談管理"
        sticky={false}
        border={false}
        action={
          <div className="flex gap-2">
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <LayoutList className="size-4" />
                テーブル
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Kanban className="size-4" />
                カンバン
              </button>
            </div>
            <Button variant="primary" onClick={openCreate}>
              新規登録
            </Button>
          </div>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      {viewMode === "table" && (
        <>
          <StickyFilterBar>
            <SearchBar value={search} onChange={setSearch} placeholder="商談名・企業名で検索" />
            <div className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 cursor-pointer">
                  {statusFilter !== "all" ? (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                      ステータス：{dealStatusLabels[statusFilter] ?? statusFilter}
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter("all");
                        }}
                        className="ml-0.5 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">ステータス</span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-auto py-2">
                  <DropdownMenuItem className="py-2" onClick={() => setStatusFilter("all")}>
                    <span className={cn(statusFilter === "all" && "font-medium")}>すべて</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(dealStatusLabels).map(([value, label]) => (
                    <DropdownMenuItem
                      key={value}
                      className="py-2"
                      onClick={() => setStatusFilter(value)}
                    >
                      <span className={cn(statusFilter === value && "font-medium")}>{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <SavedViewSelector
                entityType="deal"
                availableFields={DEAL_AVAILABLE_FIELDS}
                currentConfig={viewConfig}
                onApplyView={setViewConfig}
              />
            </div>
          </StickyFilterBar>

          <TableSection>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={bulk.isAllSelected}
                      indeterminate={bulk.isIndeterminate}
                      onCheckedChange={() => bulk.toggleAll()}
                    />
                  </TableHead>
                  <TableHead>商談名</TableHead>
                  <TableHead>企業</TableHead>
                  <TableHead>ステージ</TableHead>
                  <TableHead>確度</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>見込み日</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={8}
                  isLoading={!deals}
                  isEmpty={viewFiltered.length === 0}
                  emptyMessage="商談が見つかりません"
                >
                  {paginatedItems.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/crm/deals/${deal.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={bulk.isSelected(deal.id)}
                          onCheckedChange={() => bulk.toggle(deal.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>{deal.crm_companies?.name ?? "—"}</TableCell>
                      <TableCell>
                        {resolveStageLabel(
                          deal.stage_id,
                          getStagesFromPipeline(
                            pipelines?.find((p) => p.id === deal.pipeline_id) ?? defaultPipeline
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {deal.probability != null ? `${deal.probability}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {deal.amount != null ? `¥${deal.amount.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>{deal.expected_close_date ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={dealStatusColors[deal.status]}>
                          {dealStatusLabels[deal.status] ?? deal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </TableSection>

          <BulkActionBar
            selectedIds={bulk.selectedIds}
            totalCount={paginatedItems.length}
            onClearSelection={bulk.clear}
            actions={[
              {
                label: "一括削除",
                icon: <Trash2 className="size-4 mr-1" />,
                variant: "destructive",
                confirm: true,
                confirmMessage: `選択した${bulk.selectedIds.length}件の商談を削除しますか？`,
                onClick: handleBulkDelete,
              },
            ]}
          />
        </>
      )}

      {viewMode === "kanban" && deals && (
        <>
          {(pipelines ?? []).length > 1 && (
            <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 py-2 bg-white border-b">
              <Label className="text-sm text-muted-foreground shrink-0">パイプライン</Label>
              <Select
                value={kanbanPipeline?.id ?? ""}
                onValueChange={(v) => setKanbanPipelineId(v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pipelines ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DealKanban
            deals={deals.filter(
              (d) => !kanbanPipeline || !d.pipeline_id || d.pipeline_id === kanbanPipeline.id
            )}
            stages={kanbanStages}
            onStageChange={handleStageChange}
            onDealClick={(id) => router.push(`/crm/deals/${id}`)}
          />
        </>
      )}

      <DealEditPanel
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editData={editData}
        setEditData={setEditData}
        errors={errors}
        handleSave={handleSave}
        handleDelete={handleDelete}
        saving={saving}
        deleting={deleting}
        showToast={showToast}
        companies={companies}
        contacts={contacts}
        pipelines={pipelines}
        defaultPipeline={defaultPipeline}
      />
    </div>
  );
}
