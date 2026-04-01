"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { cn } from "@/lib/utils";
import { useCrmQuotes } from "@/lib/hooks/use-crm";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants/crm";
import { Plus, SlidersHorizontal, X } from "lucide-react";

export default function QuotesPage() {
  const router = useRouter();
  const { data: quotes, error } = useCrmQuotes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return (quotes ?? []).filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        q.title.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s) ||
        q.bc_companies?.name?.toLowerCase().includes(s)
      );
    });
  }, [quotes, search, statusFilter]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="見積書一覧"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Link href="/crm/quotes/new">
            <Button>
              <Plus className="size-4 mr-1.5" />
              新規作成
            </Button>
          </Link>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="見積番号・タイトル・企業名で検索"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {statusFilter !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  ステータス：{quoteStatusLabels[statusFilter] ?? statusFilter}
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
            {Object.entries(quoteStatusLabels).map(([value, label]) => (
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
              <TableHead>見積番号</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>取引先</TableHead>
              <TableHead>商談</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">合計金額</TableHead>
              <TableHead>発行日</TableHead>
              <TableHead>有効期限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={8}
              isLoading={!quotes}
              isEmpty={filtered.length === 0}
              emptyMessage="見積書が見つかりません"
            >
              {filtered.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/quotes/${q.id}`)}
                >
                  <TableCell className="font-medium text-primary">{q.quote_number}</TableCell>
                  <TableCell>{q.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.bc_companies?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.bc_deals?.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={quoteStatusColors[q.status]}>
                      {quoteStatusLabels[q.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    ¥{q.total.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{q.issue_date}</TableCell>
                  <TableCell className="text-muted-foreground">{q.expiry_date ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
