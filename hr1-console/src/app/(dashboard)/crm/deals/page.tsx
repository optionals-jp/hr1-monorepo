"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCrmDealsPage } from "@/features/crm/hooks/use-crm-deals-page";
import { DealFormPanel } from "@/features/crm/components/deal-form-panel";
import { formatJpy, formatDate } from "@/features/crm/rules";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import { Plus, Kanban, List, Building2, User, Calendar, DollarSign } from "lucide-react";
import type { StatusFilter } from "@/features/crm/hooks/use-crm-deals-page";

export default function CrmDealsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmDealsPage();

  const onSave = async () => {
    const result = await h.handleSave();
    if (result.success) showToast("商談を作成しました");
    else if (result.error) showToast(result.error, "error");
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="商談パイプライン"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "商談", href: "/crm/deals" },
        ]}
        action={
          <Button onClick={h.openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            商談を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <div className="px-4 sm:px-6 md:px-8 pt-3 pb-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => h.setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                h.viewMode === "kanban"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="h-4 w-4" />
              カンバン
            </button>
            <button
              type="button"
              onClick={() => h.setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                h.viewMode === "list"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
              リスト
            </button>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center rounded-full bg-gray-100 px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white border border-transparent">
              <input
                placeholder="商談名・企業名で検索"
                aria-label="商談名・企業名で検索"
                value={h.search}
                onChange={(e) => h.setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-1"
              />
            </div>
          </div>
          <Select
            value={h.statusFilter}
            onValueChange={(v) => h.setStatusFilter((v ?? "all") as StatusFilter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="open">商談中</SelectItem>
              <SelectItem value="won">受注</SelectItem>
              <SelectItem value="lost">失注</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </StickyFilterBar>

      {h.viewMode === "kanban" && (
        <div className="flex-1 px-4 sm:px-6 md:px-8 pb-6 pt-4">
          {h.loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">読み込み中...</p>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: "fit-content" }}>
                {h.kanbanColumns.map((col) => (
                  <div
                    key={col.id}
                    className="min-w-[280px] w-[280px] flex flex-col bg-muted/50 rounded-xl"
                  >
                    <div className="px-3 py-3 border-b border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: col.color }}
                        />
                        <span className="text-sm font-semibold truncate">{col.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs tabular-nums">
                          {col.deals.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatJpy(col.totalAmount)}
                      </p>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                      {col.deals.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">商談なし</p>
                      ) : (
                        col.deals.map((deal) => (
                          <Card
                            key={deal.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => router.push(`/crm/deals/${deal.id}`)}
                          >
                            <CardContent className="p-3">
                              <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">
                                {deal.title}
                              </p>
                              {deal.crm_companies?.name && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{deal.crm_companies.name}</span>
                                </div>
                              )}
                              {deal.amount != null && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                  <DollarSign className="h-3 w-3 shrink-0" />
                                  <span className="tabular-nums">{formatJpy(deal.amount)}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-3">
                                  {deal.probability != null && (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                      {deal.probability}%
                                    </span>
                                  )}
                                  {deal.expected_close_date && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3 shrink-0" />
                                      <span className="tabular-nums">
                                        {formatDate(deal.expected_close_date)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {deal.profiles?.display_name && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[60px]">
                                      {deal.profiles.display_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {h.viewMode === "list" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商談名</TableHead>
                <TableHead>企業</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead>ステージ</TableHead>
                <TableHead className="text-right">確度</TableHead>
                <TableHead>担当</TableHead>
                <TableHead>予定日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={7}
                isLoading={h.loading}
                isEmpty={h.filteredDeals.length === 0}
                emptyMessage="商談がありません"
              >
                {h.filteredDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/crm/deals/${deal.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{deal.title}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {deal.crm_companies?.name ?? "---"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deal.amount != null ? formatJpy(deal.amount) : "---"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dealStatusColors[deal.status] ?? "default"}>
                        {deal.status === "open"
                          ? h.getStageName(deal)
                          : (dealStatusLabels[deal.status] ?? deal.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deal.probability != null ? `${deal.probability}%` : "---"}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {h.getEmployeeName(deal.assigned_to)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground tabular-nums">
                        {formatDate(deal.expected_close_date)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      <DealFormPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="商談を追加"
        saveLabel="作成"
        onSave={onSave}
        saving={h.saving}
        form={h.form}
        updateField={h.updateField}
        companies={h.companies ?? []}
        stages={h.stages}
        employees={h.employees ?? []}
      />
    </div>
  );
}
