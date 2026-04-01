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
import { useRouter } from "next/navigation";
import { useCrmContacts } from "@/lib/hooks/use-crm";
import { SavedViewSelector } from "@/components/crm/saved-view-selector";
import { applyFilters, applySort } from "@/lib/hooks/use-saved-views";
import type { CrmSavedViewConfig } from "@/types/database";
import { SlidersHorizontal } from "lucide-react";

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
    let result = filtered as unknown as Record<string, unknown>[];
    if (viewConfig.filters && viewConfig.filters.length > 0) {
      result = applyFilters(result, viewConfig.filters);
    }
    if (viewConfig.sort) {
      result = applySort(result, viewConfig.sort);
    }
    return result as unknown as typeof filtered;
  }, [filtered, viewConfig.filters, viewConfig.sort]);

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
              <TableHead>氏名</TableHead>
              <TableHead>企業</TableHead>
              <TableHead>部署・役職</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>電話</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
      </TableSection>
    </div>
  );
}
