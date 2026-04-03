"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useCrmContacts } from "@/lib/hooks/use-crm";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { CrmSavedViewConfig } from "@/types/database";
import { SlidersHorizontal, Trash2 } from "lucide-react";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { deleteContact } from "@/lib/repositories/crm-repository";

export default function CrmContactsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");

  const { data: contacts, error, mutate } = useCrmContacts();

  const [viewConfig, setViewConfig] = useState<CrmSavedViewConfig>({});

  const CONTACT_AVAILABLE_FIELDS = useMemo(
    () => [
      { key: "last_name", label: "姓" },
      { key: "first_name", label: "名" },
      { key: "email", label: "メール" },
      { key: "phone", label: "電話" },
      { key: "department", label: "部署" },
      { key: "position", label: "役職" },
    ],
    []
  );

  const filtered = (contacts ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const fullName = `${c.last_name}${c.first_name ?? ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.bc_companies?.name.toLowerCase().includes(q)
    );
  });

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
    const client = getSupabase();
    for (const id of ids) {
      await deleteContact(client, id, organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件の連絡先を削除しました`);
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="連絡先" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="名前・メール・企業名で検索" />
        <div className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          <SavedViewSelector
            entityType="contact"
            availableFields={CONTACT_AVAILABLE_FIELDS}
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
              <TableHead>氏名</TableHead>
              <TableHead>企業</TableHead>
              <TableHead>部署・役職</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>電話</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={!contacts}
              isEmpty={viewFiltered.length === 0}
              emptyMessage="連絡先が見つかりません"
            >
              {paginatedItems.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/contacts/${c.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulk.isSelected(c.id)}
                      onCheckedChange={() => bulk.toggle(c.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.last_name} {c.first_name ?? ""}
                  </TableCell>
                  <TableCell>{c.bc_companies?.name ?? "—"}</TableCell>
                  <TableCell>
                    {[c.department, c.position].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? c.mobile_phone ?? "—"}</TableCell>
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
            confirmMessage: `選択した${bulk.selectedIds.length}件の連絡先を削除しますか？`,
            onClick: handleBulkDelete,
          },
        ]}
      />
    </div>
  );
}
