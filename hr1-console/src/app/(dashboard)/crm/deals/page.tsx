"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useCrmDealsPage, useCrmCompanies, useCrmContacts } from "@/lib/hooks/use-crm";
import { DealKanban } from "@/components/crm/deal-kanban";
import { getSupabase } from "@/lib/supabase/browser";
import { updateDeal } from "@/lib/repositories/crm-repository";
import { useOrg } from "@/lib/org-context";
import { fireTrigger } from "@/lib/automation/engine";
import {
  useDefaultPipeline,
  getStagesFromPipeline,
  resolveStageLabel,
} from "@/lib/hooks/use-pipelines";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { BcDeal, CrmSavedViewConfig } from "@/types/database";
import { LayoutList, Kanban, Settings } from "lucide-react";
import Link from "next/link";

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
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  } = useCrmDealsPage();

  const { data: companies } = useCrmCompanies();
  const { data: contacts } = useCrmContacts();
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);

  // 保存ビュー
  const [viewConfig, setViewConfig] = useState<CrmSavedViewConfig>({});

  const DEAL_AVAILABLE_FIELDS = useMemo(
    () => [
      { key: "title", label: "商談名" },
      { key: "stage", label: "ステージ" },
      { key: "status", label: "ステータス" },
      { key: "probability", label: "確度" },
      { key: "amount", label: "金額" },
      { key: "expected_close_date", label: "見込み日" },
    ],
    []
  );

  // ビューのフィルタ・ソートを適用
  const viewFiltered = useMemo(() => {
    let result = filtered as Record<string, unknown>[];
    if (viewConfig.filters && viewConfig.filters.length > 0) {
      result = applyFilters(result, viewConfig.filters);
    }
    if (viewConfig.sort) {
      result = applySort(result, viewConfig.sort);
    }
    return result as typeof filtered;
  }, [filtered, viewConfig.filters, viewConfig.sort]);

  const handleStageChange = async (dealId: string, newStageId: string, newProbability: number) => {
    if (!organization) return;
    const targetStage = stages.find((s) => s.id === newStageId);
    // 楽観的更新: UI を先に更新し、失敗時にリバート
    const previousDeals = deals;
    mutate(
      deals?.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage_id: newStageId,
              stage: targetStage?.name ?? d.stage,
              probability: newProbability,
            }
          : d
      ),
      false
    );
    try {
      await updateDeal(getSupabase(), dealId, organization.id, {
        stage_id: newStageId,
        stage: targetStage?.name ?? newStageId,
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
            stage: targetStage?.name ?? newStageId,
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
    <div>
      <PageHeader
        title="商談管理"
        action={
          <div className="flex gap-2">
            <Link href="/crm/settings/pipelines">
              <Button variant="outline" size="sm">
                <Settings className="size-4 mr-1.5" />
                パイプライン設定
              </Button>
            </Link>
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
            <Button onClick={openCreate}>新規登録</Button>
          </div>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      {viewMode === "table" && (
        <>
          <div className="mb-4 flex gap-2 items-center flex-wrap">
            <SearchBar value={search} onChange={setSearch} placeholder="商談名・企業名で検索" />
            <SavedViewSelector
              entityType="deal"
              availableFields={DEAL_AVAILABLE_FIELDS}
              currentConfig={viewConfig}
              onApplyView={setViewConfig}
            />
            <div className="flex gap-1">
              {[
                { value: "all", label: "すべて" },
                { value: "open", label: "商談中" },
                { value: "won", label: "受注" },
                { value: "lost", label: "失注" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    statusFilter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商談名</TableHead>
                <TableHead>企業</TableHead>
                <TableHead>ステージ</TableHead>
                <TableHead>確度</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>見込み日</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableEmptyState
              colSpan={7}
              isLoading={!deals}
              isEmpty={viewFiltered.length === 0}
              emptyMessage="商談が見つかりません"
            >
              {viewFiltered.map((deal) => (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/deals/${deal.id}`)}
                >
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>{deal.bc_companies?.name ?? "—"}</TableCell>
                  <TableCell>{resolveStageLabel(deal.stage, deal.stage_id, stages)}</TableCell>
                  <TableCell>{deal.probability != null ? `${deal.probability}%` : "—"}</TableCell>
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
          </Table>
        </>
      )}

      {viewMode === "kanban" && deals && (
        <DealKanban
          deals={deals}
          stages={stages}
          onStageChange={handleStageChange}
          onDealClick={(id) => router.push(`/crm/deals/${id}`)}
        />
      )}

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "商談編集" : "商談登録"}
        onSave={() => handleSave(showToast)}
        saving={saving}
        onDelete={editData.id ? () => handleDelete(showToast) : undefined}
        deleting={deleting}
        confirmDeleteMessage="この商談を削除しますか？関連する見積書・連絡先の紐付けも削除されます。"
      >
        <div className="space-y-4">
          <div>
            <Label>商談名 *</Label>
            <Input
              value={editData.title ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
              className={errors?.title ? "border-destructive" : ""}
            />
            {errors?.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label>企業</Label>
            <Select
              value={editData.company_id ?? ""}
              onValueChange={(v) => setEditData((p) => ({ ...p, company_id: v || null }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="企業を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未選択</SelectItem>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>連絡先</Label>
            <Select
              value={editData.contact_id ?? ""}
              onValueChange={(v) => setEditData((p) => ({ ...p, contact_id: v || null }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="連絡先を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未選択</SelectItem>
                {(contacts ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.last_name} {c.first_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ステージ</Label>
              <Select
                value={editData.stage_id ?? editData.stage ?? stages[0]?.id ?? ""}
                onValueChange={(v) => {
                  const selectedStage = stages.find((s) => s.id === v);
                  const newStage = selectedStage?.name ?? v;
                  setEditData(
                    (p) =>
                      ({
                        ...p,
                        stage_id: v,
                        stage: newStage,
                        probability: selectedStage?.probability_default ?? p.probability,
                      }) as Partial<BcDeal>
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ステータス</Label>
              <Select
                value={editData.status ?? "open"}
                onValueChange={(v) =>
                  setEditData((p) => ({
                    ...p,
                    status: v as "open" | "won" | "lost",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dealStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>確度（{editData.probability ?? 0}%）</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={editData.probability ?? 0}
              onChange={(e) => setEditData((p) => ({ ...p, probability: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>金額</Label>
              <Input
                type="number"
                value={editData.amount ?? ""}
                onChange={(e) =>
                  setEditData((p) => ({
                    ...p,
                    amount: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="¥"
              />
            </div>

            <div>
              <Label>見込み日</Label>
              <Input
                type="date"
                value={editData.expected_close_date ?? ""}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, expected_close_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>説明</Label>
            <Textarea
              value={editData.description ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
