"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useWikiPage } from "@/lib/hooks/use-wiki";
import { format } from "date-fns";

export default function WikiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: page, isLoading, error, mutate } = useWikiPage(id);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Wiki"
          sticky={false}
          border={false}
          breadcrumb={[{ label: "Wiki", href: "/wiki" }]}
        />
        <PageContent>
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        </PageContent>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Wiki"
          sticky={false}
          border={false}
          breadcrumb={[{ label: "Wiki", href: "/wiki" }]}
        />
        {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}
        <PageContent>
          <div className="py-12 text-center text-sm text-muted-foreground">
            ページが見つかりません。
            <Link href="/wiki" className="text-primary hover:underline ml-1">
              一覧に戻る
            </Link>
          </div>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={page.title}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "Wiki", href: "/wiki" }]}
      />
      <PageContent>
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            {page.category && <Badge variant="outline">{page.category}</Badge>}
            <span className="text-xs text-muted-foreground">
              最終更新: {format(new Date(page.updated_at), "yyyy/MM/dd HH:mm")}
            </span>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {page.content}
          </div>
        </div>
      </PageContent>
    </div>
  );
}
