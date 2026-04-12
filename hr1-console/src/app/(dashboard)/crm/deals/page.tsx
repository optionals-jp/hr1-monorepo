"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
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
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchDeals, fetchCompanies, createDeal } from "@/lib/repositories/crm-repository";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { formatJpy } from "@/features/crm/rules";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants/crm";
import { cn } from "@/lib/utils";
import { Plus, Kanban, List, Building2, User, Calendar, DollarSign } from "lucide-react";
import type { BcDeal } from "@/types/database";

type ViewMode = "kanban" | "list";
type StatusFilter = "all" | "open" | "won" | "lost";

interface DealFormData {
  title: string;
  company_id: string;
  amount: string;
  stage_id: string;
  probability: string;
  expected_close_date: string;
  assigned_to: string;
  description: string;
}

const emptyForm: DealFormData = {
  title: "",
  company_id: "",
  amount: "",
  stage_id: "",
  probability: "",
  expected_close_date: "",
  assigned_to: "",
  description: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function CrmDealsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);
  const { data: employees } = useEmployees();

  const { data: deals, mutate: mutateDeals } = useOrgQuery("crm-deals-list", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: companies } = useOrgQuery("crm-deals-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<DealFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter deals
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    let result = deals;
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.crm_companies?.name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [deals, statusFilter, search]);

  // Open add panel
  const openAdd = useCallback(() => {
    setForm({
      ...emptyForm,
      stage_id: stages[0]?.id ?? "",
    });
    setEditOpen(true);
  }, [stages]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof DealFormData>(field: K, value: DealFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save deal
  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!form.title.trim()) {
      showToast("商談名は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      await createDeal(getSupabase(), {
        organization_id: organization.id,
        title: form.title.trim(),
        company_id: form.company_id || null,
        amount: form.amount ? Number(form.amount) : null,
        stage_id: form.stage_id || null,
        probability: form.probability ? Number(form.probability) : null,
        expected_close_date: form.expected_close_date || null,
        description: form.description.trim() || null,
        assigned_to: form.assigned_to || null,
        pipeline_id: defaultPipeline?.id ?? null,
        status: "open",
        created_by: user?.id ?? null,
      });
      showToast("商談を作成しました");
      setEditOpen(false);
      mutateDeals();
    } catch {
      showToast("商談の作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, defaultPipeline, user, showToast, mutateDeals]);

  // Group deals by stage for kanban
  const kanbanColumns = useMemo(() => {
    const openDeals = (deals ?? []).filter((d) => d.status === "open");
    const wonDeals = (deals ?? []).filter((d) => d.status === "won");
    const lostDeals = (deals ?? []).filter((d) => d.status === "lost");

    // Apply search filter to kanban too
    const filterFn = (d: BcDeal) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) || (d.crm_companies?.name ?? "").toLowerCase().includes(q)
      );
    };

    const stageColumns = stages.map((stage) => {
      const stageDeals = openDeals.filter((d) => d.stage_id === stage.id).filter(filterFn);
      return {
        id: stage.id,
        name: stage.name,
        color: stage.color,
        deals: stageDeals,
        totalAmount: stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      };
    });

    const filteredWon = wonDeals.filter(filterFn);
    const filteredLost = lostDeals.filter(filterFn);

    return [
      ...stageColumns,
      {
        id: "__won__",
        name: "受注",
        color: "#22c55e",
        deals: filteredWon,
        totalAmount: filteredWon.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      },
      {
        id: "__lost__",
        name: "失注",
        color: "#ef4444",
        deals: filteredLost,
        totalAmount: filteredLost.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      },
    ];
  }, [deals, stages, search]);

  // Resolve employee name
  const getEmployeeName = useCallback(
    (userId: string | null) => {
      if (!userId || !employees) return "---";
      const emp = employees.find((e) => e.id === userId);
      return emp?.display_name ?? emp?.email ?? "---";
    },
    [employees]
  );

  // Resolve stage name
  const getStageName = useCallback(
    (deal: BcDeal) => {
      if (deal.status === "won") return "受注";
      if (deal.status === "lost") return "失注";
      if (deal.stage_id) {
        const stage = stages.find((s) => s.id === deal.stage_id);
        if (stage) return stage.name;
      }
      return "---";
    },
    [stages]
  );

  const loading = !deals;

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
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            商談を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <div className="px-4 sm:px-6 md:px-8 pt-3 pb-2 flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="h-4 w-4" />
              カンバン
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
              リスト
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center rounded-full bg-gray-100 px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white border border-transparent">
              <input
                placeholder="商談名・企業名で検索"
                aria-label="商談名・企業名で検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-1"
              />
            </div>
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
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

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex-1 px-4 sm:px-6 md:px-8 pb-6 pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">読み込み中...</p>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: "fit-content" }}>
                {kanbanColumns.map((column) => (
                  <div
                    key={column.id}
                    className="min-w-[280px] w-[280px] flex flex-col bg-muted/50 rounded-xl"
                  >
                    {/* Column header */}
                    <div className="px-3 py-3 border-b border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: column.color }}
                        />
                        <span className="text-sm font-semibold truncate">{column.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs tabular-nums">
                          {column.deals.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatJpy(column.totalAmount)}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                      {column.deals.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">商談なし</p>
                      ) : (
                        column.deals.map((deal) => (
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

      {/* List View */}
      {viewMode === "list" && (
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
                isLoading={loading}
                isEmpty={filteredDeals.length === 0}
                emptyMessage="商談がありません"
              >
                {filteredDeals.map((deal) => (
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
                          ? getStageName(deal)
                          : (dealStatusLabels[deal.status] ?? deal.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deal.probability != null ? `${deal.probability}%` : "---"}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {getEmployeeName(deal.assigned_to)}
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

      {/* Add Deal Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="商談を追加"
        onSave={handleSave}
        saving={saving}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">
              商談名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deal-title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="例: システム導入案件"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-company">企業</Label>
            <Select
              value={form.company_id}
              onValueChange={(v) => updateField("company_id", v ?? "")}
            >
              <SelectTrigger id="deal-company">
                <SelectValue placeholder="企業を選択" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-amount">金額</Label>
            <Input
              id="deal-amount"
              type="number"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              placeholder="例: 1500000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-stage">ステージ</Label>
            <Select value={form.stage_id} onValueChange={(v) => updateField("stage_id", v ?? "")}>
              <SelectTrigger id="deal-stage">
                <SelectValue placeholder="ステージを選択" />
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

          <div className="space-y-1.5">
            <Label htmlFor="deal-probability">確度 (%)</Label>
            <Input
              id="deal-probability"
              type="number"
              min={0}
              max={100}
              value={form.probability}
              onChange={(e) => updateField("probability", e.target.value)}
              placeholder="例: 50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-close-date">受注予定日</Label>
            <Input
              id="deal-close-date"
              type="date"
              value={form.expected_close_date}
              onChange={(e) => updateField("expected_close_date", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-assigned">担当者</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) => updateField("assigned_to", v ?? "")}
            >
              <SelectTrigger id="deal-assigned">
                <SelectValue placeholder="担当者を選択" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.display_name ?? e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-description">説明</Label>
            <Textarea
              id="deal-description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="商談の詳細や備考を入力"
              rows={3}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
