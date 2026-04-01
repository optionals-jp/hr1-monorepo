"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { dealStatusLabels, dealStatusColors, dealStageLabels } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useCrmDealsAll } from "@/lib/hooks/use-crm";

export default function CrmDealsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: deals, error } = useCrmDealsAll();

  const filtered = (deals ?? []).filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.bc_companies?.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader title="商談管理" />
      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="商談名・企業名で検索" />
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
                statusFilter === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商談名</TableHead>
              <TableHead>企業</TableHead>
              <TableHead>ステージ</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>見込み日</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableEmptyState
            colSpan={6}
            isLoading={!deals}
            isEmpty={filtered.length === 0}
            emptyMessage="商談が見つかりません"
          >
            {filtered.map((deal) => (
              <TableRow
                key={deal.id}
                className="cursor-pointer"
                onClick={() => router.push(`/crm/deals/${deal.id}`)}
              >
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell>{deal.bc_companies?.name ?? "—"}</TableCell>
                <TableCell>{dealStageLabels[deal.stage] ?? deal.stage}</TableCell>
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
      </TableSection>
    </div>
  );
}
