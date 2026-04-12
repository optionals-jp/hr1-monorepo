"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@hr1/shared-ui/lib/utils";
import { useCrmQuotes } from "@/lib/hooks/use-crm";
import { useTabParam } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { deleteQuote } from "@/lib/repositories/quote-repository";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants";
import { Plus, SlidersHorizontal, X, Trash2 } from "lucide-react";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";

export default function QuotesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: quotes, error, mutate } = useCrmQuotes();
  const [search, setSearch] = useState("");
  // URL ?tab= でステータスフィルタを保持。
  const [statusFilter, setStatusFilter] = useTabParam<string>("all");

  const filtered = useMemo(() => {
    return (quotes ?? []).filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        q.title.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s) ||
        q.crm_companies?.name?.toLowerCase().includes(s)
      );
    });
  }, [quotes, search, statusFilter]);

  const { page, pageSize, totalCount, paginatedItems, onPageChange, onPageSizeChange } =
    usePagination(filtered);
  const bulk = useBulkSelection(paginatedItems);

  const handleBulkDelete = async (ids: string[]) => {
    if (!organization) return;
    for (const id of ids) {
      await deleteQuote(getSupabase(), id, organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件の見積書を削除しました`);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="見積書一覧"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "商談管理", href: "/deals" }]}
        action={
          <Link href="/quotes/new">
            <Button variant="primary">
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
              <TableHead className="w-10">
                <Checkbox
                  checked={bulk.isAllSelected}
                  indeterminate={bulk.isIndeterminate}
                  onCheckedChange={() => bulk.toggleAll()}
                />
              </TableHead>
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
              colSpan={9}
              isLoading={!quotes}
              isEmpty={filtered.length === 0}
              emptyMessage="見積書が見つかりません"
            >
              {paginatedItems.map((q) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/quotes/${q.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulk.isSelected(q.id)}
                      onCheckedChange={() => bulk.toggle(q.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-primary">{q.quote_number}</TableCell>
                  <TableCell>{q.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.crm_companies?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.crm_deals?.title ?? "—"}
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
            confirmMessage: `選択した${bulk.selectedIds.length}件の見積書を削除しますか？`,
            onClick: handleBulkDelete,
          },
        ]}
      />
    </div>
  );
}
