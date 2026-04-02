"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { useCrmLeadsPage, useCrmCompanies } from "@/lib/hooks/use-crm";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { convertLead } from "@/lib/repositories/lead-repository";
import { fireTrigger } from "@/lib/automation/engine";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import type { BcLead } from "@/types/database";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, SlidersHorizontal, X, Upload, Trash2 } from "lucide-react";
import { LeadImportDialog } from "./lead-import-dialog";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";

export default function CrmLeadsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { organization } = useOrg();
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
    leads,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  } = useCrmLeadsPage();

  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);
  const { data: existingCompanies } = useCrmCompanies();

  const [importOpen, setImportOpen] = useState(false);

  const { page, pageSize, totalCount, paginatedItems, onPageChange, onPageSizeChange } =
    usePagination(filtered);
  const bulk = useBulkSelection(paginatedItems);

  const handleBulkDelete = async (ids: string[]) => {
    if (!organization) return;
    const client = getSupabase();
    for (const id of ids) {
      await client.from("bc_leads").delete().eq("id", id).eq("organization_id", organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件のリードを削除しました`);
  };

  // コンバージョンダイアログ
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<BcLead | null>(null);
  const [convertData, setConvertData] = useState({
    existingCompanyId: "" as string,
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    dealTitle: "",
  });
  const [converting, setConverting] = useState(false);

  // リード企業名に一致する既存企業を探す
  const findMatchingCompany = (companyName: string) =>
    (existingCompanies ?? []).find(
      (c) => c.name.trim().toLowerCase() === companyName.trim().toLowerCase()
    );

  const openConvert = (lead: BcLead) => {
    setConvertTarget(lead);
    const match = findMatchingCompany(lead.name);
    setConvertData({
      existingCompanyId: match?.id ?? "",
      companyName: lead.name,
      contactName: lead.contact_name ?? "",
      contactEmail: lead.contact_email ?? "",
      contactPhone: lead.contact_phone ?? "",
      dealTitle: `${lead.name} - 商談`,
    });
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!convertTarget || !organization) return;
    const needsCompanyName = !convertData.existingCompanyId && !convertData.companyName;
    if (needsCompanyName || !convertData.dealTitle) {
      showToast("企業名と商談名は必須です", "error");
      return;
    }
    setConverting(true);
    try {
      const firstStage = stages[0];
      const useExisting = !!convertData.existingCompanyId;
      await convertLead(getSupabase(), convertTarget.id, organization.id, {
        existingCompanyId: convertData.existingCompanyId || undefined,
        companyName: convertData.companyName,
        contactName: convertData.contactName || null,
        contactEmail: convertData.contactEmail || null,
        contactPhone: convertData.contactPhone || null,
        dealTitle: convertData.dealTitle,
        dealStage: firstStage?.name ?? "initial",
        dealStageId: firstStage?.id,
        dealPipelineId: firstStage?.pipeline_id,
      });
      const hasContact = !!convertData.contactName;
      showToast(
        useExisting
          ? `リードをコンバートしました（既存企業に${hasContact ? "連絡先・" : ""}商談を作成）`
          : `リードをコンバートしました（企業${hasContact ? "・連絡先" : ""}・商談を作成）`
      );
      // コンバートトリガー（非同期）
      fireTrigger(getSupabase(), {
        organizationId: organization.id,
        triggerType: "lead_converted",
        entityType: "lead",
        entityId: convertTarget.id,
        entityData: convertTarget as unknown as Record<string, unknown>,
      }).catch(() => {});
      setConvertOpen(false);
      mutate();
    } catch {
      showToast("コンバートに失敗しました", "error");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="リード管理"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button onClick={openCreate}>新規登録</Button>
          </div>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="企業名・担当者名・メールで検索"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {statusFilter !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  ステータス：{leadStatusLabels[statusFilter] ?? statusFilter}
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
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => setStatusFilter("all")}>
              <span className={cn(statusFilter === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <DropdownMenuItem key={value} className="py-2" onClick={() => setStatusFilter(value)}>
                <span className={cn(statusFilter === value && "font-medium")}>{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
              <TableHead>企業名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-25">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={!leads}
              isEmpty={filtered.length === 0}
              emptyMessage="リードが見つかりません"
            >
              {paginatedItems.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/leads/${lead.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulk.isSelected(lead.id)}
                      onCheckedChange={() => bulk.toggle(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.contact_name ?? "—"}</TableCell>
                  <TableCell>{leadSourceLabels[lead.source] ?? lead.source}</TableCell>
                  <TableCell>
                    <Badge variant={leadStatusColors[lead.status]}>
                      {leadStatusLabels[lead.status] ?? lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.status !== "converted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConvert(lead);
                        }}
                      >
                        <ArrowRightLeft className="size-3.5 mr-1" />
                        変換
                      </Button>
                    )}
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
            confirmMessage: `選択した${bulk.selectedIds.length}件のリードを削除しますか？`,
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* リード編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "リード編集" : "リード登録"}
        onSave={() => handleSave(showToast)}
        saving={saving}
        onDelete={editData.id ? () => handleDelete(showToast) : undefined}
        deleting={deleting}
        confirmDeleteMessage="このリードを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-4">
          <div>
            <Label>企業名 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              className={errors?.name ? "border-destructive" : ""}
            />
            {errors?.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label>担当者名</Label>
            <Input
              value={editData.contact_name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, contact_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>担当者メール</Label>
              <Input
                type="email"
                value={editData.contact_email ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, contact_email: e.target.value }))}
              />
            </div>
            <div>
              <Label>担当者電話</Label>
              <Input
                value={editData.contact_phone ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, contact_phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ソース</Label>
              <Select
                value={editData.source ?? "other"}
                onValueChange={(v) => setEditData((p) => ({ ...p, source: v as BcLead["source"] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leadSourceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ステータス</Label>
              <Select
                value={editData.status ?? "new"}
                onValueChange={(v) => setEditData((p) => ({ ...p, status: v as BcLead["status"] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leadStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>メモ</Label>
            <Textarea
              value={editData.notes ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>

      {/* コンバージョンパネル */}
      <EditPanel
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="リードをコンバート"
        onSave={handleConvert}
        saveLabel={converting ? "変換中..." : "コンバート実行"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            このリードから企業・商談を作成します。担当者名がある場合は連絡先も作成されます。
          </p>

          <div>
            <Label>企業 *</Label>
            <Select
              value={convertData.existingCompanyId || "__new__"}
              onValueChange={(v) => {
                if (!v || v === "__new__") {
                  setConvertData((p) => ({ ...p, existingCompanyId: "" }));
                } else {
                  const company = (existingCompanies ?? []).find((c) => c.id === v);
                  setConvertData((p) => ({
                    ...p,
                    existingCompanyId: v,
                    companyName: company?.name || p.companyName,
                  }));
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">＋ 新規企業を作成</SelectItem>
                {(existingCompanies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!convertData.existingCompanyId && (
              <Input
                className="mt-2"
                placeholder="企業名を入力"
                value={convertData.companyName}
                onChange={(e) => setConvertData((p) => ({ ...p, companyName: e.target.value }))}
              />
            )}
          </div>

          <div>
            <Label>担当者名</Label>
            <Input
              value={convertData.contactName}
              onChange={(e) => setConvertData((p) => ({ ...p, contactName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>担当者メール</Label>
              <Input
                type="email"
                value={convertData.contactEmail}
                onChange={(e) => setConvertData((p) => ({ ...p, contactEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label>担当者電話</Label>
              <Input
                value={convertData.contactPhone}
                onChange={(e) => setConvertData((p) => ({ ...p, contactPhone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>商談名 *</Label>
            <Input
              value={convertData.dealTitle}
              onChange={(e) => setConvertData((p) => ({ ...p, dealTitle: e.target.value }))}
            />
          </div>
        </div>
      </EditPanel>

      {organization && (
        <LeadImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          organizationId={organization.id}
          onComplete={() => mutate()}
        />
      )}
    </div>
  );
}
