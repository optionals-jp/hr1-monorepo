"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useCrmCompaniesPage } from "@/lib/hooks/use-crm";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { CrmSavedViewConfig } from "@/types/database";

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
  } = useCrmCompaniesPage();

  const [viewConfig, setViewConfig] = useState<CrmSavedViewConfig>({});

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
    let result = filtered as Record<string, unknown>[];
    if (viewConfig.filters && viewConfig.filters.length > 0) {
      result = applyFilters(result, viewConfig.filters);
    }
    if (viewConfig.sort) {
      result = applySort(result, viewConfig.sort);
    }
    return result as typeof filtered;
  }, [filtered, viewConfig.filters, viewConfig.sort]);

  return (
    <div>
      <PageHeader title="取引先企業" action={<Button onClick={openCreate}>新規登録</Button>} />

      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="企業名・法人番号で検索" />
        <SavedViewSelector
          entityType="company"
          availableFields={COMPANY_AVAILABLE_FIELDS}
          currentConfig={viewConfig}
          onApplyView={setViewConfig}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>企業名</TableHead>
            <TableHead>法人番号</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>電話番号</TableHead>
          </TableRow>
        </TableHeader>
        <TableEmptyState
          colSpan={4}
          isLoading={!companies}
          isEmpty={viewFiltered.length === 0}
          emptyMessage="企業が見つかりません"
        >
          {viewFiltered.map((company) => (
            <TableRow
              key={company.id}
              className="cursor-pointer"
              onClick={() => router.push(`/crm/companies/${company.id}`)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.corporate_number ?? "—"}</TableCell>
              <TableCell>{company.industry ?? "—"}</TableCell>
              <TableCell>{company.phone ?? "—"}</TableCell>
            </TableRow>
          </TableHeader>
          <TableEmptyState
            colSpan={4}
            isLoading={!companies}
            isEmpty={filtered.length === 0}
            emptyMessage="企業が見つかりません"
          >
            {filtered.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer"
                onClick={() => router.push(`/crm/companies/${company.id}`)}
              >
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.corporate_number ?? "—"}</TableCell>
                <TableCell>{company.industry ?? "—"}</TableCell>
                <TableCell>{company.phone ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableEmptyState>
        </Table>
      </TableSection>

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
    </div>
  );
}
