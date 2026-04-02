"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useCrmCompaniesPage } from "@/lib/hooks/use-crm";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { CrmSavedViewConfig } from "@/types/database";
import { SlidersHorizontal, Upload, Trash2 } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { CompanyImportDialog } from "./company-import-dialog";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { removeCompany } from "@/lib/hooks/use-crm";

export default function CrmCompaniesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const {
    search,
    setSearch,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    companies,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  } = useCrmCompaniesPage();

  const { organization } = useOrg();
  const [viewConfig, setViewConfig] = useState<CrmSavedViewConfig>({});
  const [importOpen, setImportOpen] = useState(false);

  const existingNames = useMemo(
    () => new Set((companies ?? []).map((c) => c.name.toLowerCase())),
    [companies]
  );
  const existingCorporateNumbers = useMemo(
    () =>
      new Set(
        (companies ?? []).map((c) => c.corporate_number).filter((n): n is string => n != null)
      ),
    [companies]
  );

  const COMPANY_AVAILABLE_FIELDS = useMemo(
    () => [
      { key: "name", label: "企業名" },
      { key: "corporate_number", label: "法人番号" },
      { key: "industry", label: "業種" },
      { key: "phone", label: "電話番号" },
      { key: "address", label: "住所" },
      { key: "website", label: "Webサイト" },
    ],
    []
  );

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
      await removeCompany(id, organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件の企業を削除しました`);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="取引先企業"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button onClick={openCreate}>新規登録</Button>
          </div>
        }
      />

      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="企業名・法人番号で検索" />
        <div className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          <SavedViewSelector
            entityType="company"
            availableFields={COMPANY_AVAILABLE_FIELDS}
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
              <TableHead>企業名</TableHead>
              <TableHead>法人番号</TableHead>
              <TableHead>業種</TableHead>
              <TableHead>電話番号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={!companies}
              isEmpty={viewFiltered.length === 0}
              emptyMessage="企業が見つかりません"
            >
              {paginatedItems.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/companies/${company.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulk.isSelected(company.id)}
                      onCheckedChange={() => bulk.toggle(company.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.corporate_number ?? "—"}</TableCell>
                  <TableCell>{company.industry ?? "—"}</TableCell>
                  <TableCell>{company.phone ?? "—"}</TableCell>
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
            confirmMessage: `選択した${bulk.selectedIds.length}件の企業を削除しますか？`,
            onClick: handleBulkDelete,
          },
        ]}
      />

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "企業編集" : "企業登録"}
        onSave={() => handleSave(showToast)}
        saving={saving}
        onDelete={editData.id ? () => handleDelete(showToast) : undefined}
        deleting={deleting}
        confirmDeleteMessage="この企業を削除しますか？関連する商談・連絡先との紐付けも解除されます。"
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
            <Label>企業名（カナ）</Label>
            <Input
              value={editData.name_kana ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name_kana: e.target.value }))}
            />
          </div>
          <div>
            <Label>法人番号</Label>
            <Input
              value={editData.corporate_number ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, corporate_number: e.target.value }))}
            />
          </div>
          <div>
            <Label>電話番号</Label>
            <Input
              value={editData.phone ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>住所</Label>
            <Input
              value={editData.address ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div>
            <Label>Webサイト</Label>
            <Input
              value={editData.website ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, website: e.target.value }))}
            />
          </div>
          <div>
            <Label>業種</Label>
            <Input
              value={editData.industry ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, industry: e.target.value }))}
            />
          </div>
        </div>
      </EditPanel>

      {organization && (
        <CompanyImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          organizationId={organization.id}
          existingNames={existingNames}
          existingCorporateNumbers={existingCorporateNumbers}
          onComplete={() => mutate()}
        />
      )}
    </div>
  );
}
