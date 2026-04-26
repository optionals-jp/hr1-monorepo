"use client";

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar, type TabItem } from "@hr1/shared-ui/components/layout/tab-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { useFaqs } from "@/lib/hooks/use-faqs";
import { cn } from "@hr1/shared-ui/lib/utils";
import { ChevronDown, ChevronRight, LayoutList, SlidersHorizontal, X } from "lucide-react";

const TARGET_LABELS: Record<"employee" | "both", string> = {
  employee: "社員のみ",
  both: "社員・応募者",
};

export default function FaqsPage() {
  const router = useRouter();
  const { data: faqs = [], isLoading, error, mutate } = useFaqs();
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(faqs.map((f) => f.category))].sort(), [faqs]);

  const tabs = useMemo<TabItem[]>(
    () => [
      { value: "all", label: "すべて", icon: LayoutList },
      ...categories.map((cat) => ({ value: cat, label: cat })),
    ],
    [categories]
  );

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (categoryTab !== "all" && f.category !== categoryTab) return false;
      if (filterTarget !== "all" && f.target !== filterTarget) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      }
      return true;
    });
  }, [faqs, search, categoryTab, filterTarget]);

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader title="よくある質問" description="社内FAQ" sticky={false} border={false} />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={categoryTab} onTabChange={setCategoryTab} />
        <SearchBar value={search} onChange={setSearch} placeholder="質問・回答で検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {filterTarget !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  対象：
                  {TARGET_LABELS[filterTarget as "employee" | "both"]}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterTarget("all");
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
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">対象</div>
            <DropdownMenuItem className="py-2" onClick={() => setFilterTarget("all")}>
              <span className={cn(filterTarget === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => setFilterTarget("employee")}>
              <span className={cn(filterTarget === "employee" && "font-medium")}>社員のみ</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={() => setFilterTarget("both")}>
              <span className={cn(filterTarget === "both" && "font-medium")}>社員・応募者</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>質問</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={3}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage={
                search || categoryTab !== "all" || filterTarget !== "all"
                  ? "該当するFAQがありません"
                  : "FAQがありません"
              }
            >
              {filtered.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <Fragment key={faq.id}>
                    <TableRow className="cursor-pointer">
                      <TableCell onClick={() => router.push(`/faqs/${faq.id}`)}>
                        <span className="font-medium">{faq.question}</span>
                      </TableCell>
                      <TableCell onClick={() => router.push(`/faqs/${faq.id}`)}>
                        <Badge variant="outline">{faq.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="p-1 hover:text-foreground text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : faq.id);
                          }}
                          aria-label={isExpanded ? "折りたたむ" : "回答を表示"}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={2}>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {faq.answer}
                          </p>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 whitespace-nowrap"
                            onClick={() => router.push(`/faqs/${faq.id}`)}
                          >
                            詳細
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
