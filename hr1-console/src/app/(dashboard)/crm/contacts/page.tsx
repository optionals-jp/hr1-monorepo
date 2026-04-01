"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { useRouter } from "next/navigation";
import { useCrmContacts } from "@/lib/hooks/use-crm";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { CrmSavedViewConfig } from "@/types/database";

export default function CrmContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: contacts, error } = useCrmContacts();

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
      <PageHeader title="連絡先" />
      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="名前・メール・企業名で検索" />
        <SavedViewSelector
          entityType="contact"
          availableFields={CONTACT_AVAILABLE_FIELDS}
          currentConfig={viewConfig}
          onApplyView={setViewConfig}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>企業</TableHead>
            <TableHead>部署・役職</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>電話</TableHead>
          </TableRow>
        </TableHeader>
        <TableEmptyState
          colSpan={5}
          isLoading={!contacts}
          isEmpty={viewFiltered.length === 0}
          emptyMessage="連絡先が見つかりません"
        >
          {viewFiltered.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => router.push(`/crm/contacts/${c.id}`)}
            >
              <TableCell className="font-medium">
                {c.last_name} {c.first_name ?? ""}
              </TableCell>
              <TableCell>{c.bc_companies?.name ?? "—"}</TableCell>
              <TableCell>{[c.department, c.position].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell>{c.email ?? "—"}</TableCell>
              <TableCell>{c.phone ?? c.mobile_phone ?? "—"}</TableCell>
            </TableRow>
          </TableHeader>
          <TableEmptyState
            colSpan={5}
            isLoading={!contacts}
            isEmpty={filtered.length === 0}
            emptyMessage="連絡先が見つかりません"
          >
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => router.push(`/crm/contacts/${c.id}`)}
              >
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
        </Table>
      </TableSection>
    </div>
  );
}
