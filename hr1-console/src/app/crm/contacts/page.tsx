"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useRouter } from "next/navigation";
import type { BcContact } from "@/types/database";

export default function CrmContactsPage() {
  const { organization } = useOrg();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: contacts, error } = useQuery<BcContact[]>(
    organization ? `crm-contacts-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("bc_contacts")
        .select("*, bc_companies(name)")
        .eq("organization_id", organization!.id)
        .order("last_name");
      return data ?? [];
    }
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

  return (
    <div>
      <PageHeader title="連絡先" />
      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="名前・メール・企業名で検索" />
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
              <TableCell>{[c.department, c.position].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell>{c.email ?? "—"}</TableCell>
              <TableCell>{c.phone ?? c.mobile_phone ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableEmptyState>
      </Table>
    </div>
  );
}
