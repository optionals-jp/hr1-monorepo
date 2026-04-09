"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useWikiPages } from "@/lib/hooks/use-wiki";
import { Search, BookOpen } from "lucide-react";
import { format } from "date-fns";

export default function WikiListPage() {
  const { data: pages = [], isLoading, error, mutate } = useWikiPages();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(pages.map((p) => p.category).filter(Boolean))].sort() as string[],
    [pages]
  );

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [pages, search, selectedCategory]);

  const highlight = (text: string, maxLen: number) => {
    if (!search) return text.slice(0, maxLen);
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text.slice(0, maxLen);
    const start = Math.max(0, idx - 40);
    const snippet = text.slice(start, start + maxLen);
    return snippet;
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Wiki" description="社内ナレッジベース" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center rounded-full border shadow-sm px-5 py-3 focus-within:shadow-md focus-within:border-primary/30 transition-shadow">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              placeholder="Wikiを検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground ml-3"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
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

          {!isLoading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filtered.length}件のページ
              {search && `（「${search}」の検索結果）`}
            </p>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                {search || selectedCategory
                  ? "該当するページがありません"
                  : "Wikiページがありません"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map((page) => (
                <Link key={page.id} href={`/wiki/${page.id}`} className="block group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        wiki/{page.category ?? "一般"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {format(new Date(page.updated_at), "yyyy/MM/dd")}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-primary group-hover:underline mt-0.5">
                      {page.title}
                    </h3>
                    <p className="text-sm text-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                      {highlight(page.content, 160)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
