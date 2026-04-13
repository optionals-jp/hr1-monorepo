"use client";

import { Fragment, useState, useMemo } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
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
import { useFaqs } from "@/lib/hooks/use-faqs";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Search, ChevronDown } from "lucide-react";

export default function FaqsPage() {
  const { data: faqs = [], isLoading, error, mutate } = useFaqs();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(faqs.map((f) => f.category))].sort(), [faqs]);

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      if (selectedCategory && f.category !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      }
      return true;
    });
  }, [faqs, search, selectedCategory]);

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader title="よくある質問" description="社内FAQ" sticky={false} border={false} />

      <div className="px-6 pb-4 space-y-3">
        <div className="flex items-center rounded-full bg-gray-100 px-4 py-2.5 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="質問を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground ml-2"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              すべて
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

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
                search || selectedCategory ? "該当するFAQがありません" : "FAQがありません"
              }
            >
              {filtered.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <Fragment key={faq.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    >
                      <TableCell>
                        <span className="font-medium">{faq.question}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{faq.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={3}>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {faq.answer}
                          </p>
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
