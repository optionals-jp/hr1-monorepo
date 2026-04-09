"use client";

import { useState, useMemo } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useFaqs } from "@/lib/hooks/use-faqs";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Search, ChevronDown, CircleHelp } from "lucide-react";

export default function FaqsPage() {
  const { data: faqs = [], isLoading, error, mutate } = useFaqs();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

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

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="よくある質問" description="社内FAQ" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="space-y-4">
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

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <CircleHelp className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                {search || selectedCategory ? "該当するFAQがありません" : "FAQがありません"}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filtered.map((faq) => {
                const isOpen = openIds.has(faq.id);
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      onClick={() => toggle(faq.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{faq.question}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {faq.category}
                        </Badge>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
