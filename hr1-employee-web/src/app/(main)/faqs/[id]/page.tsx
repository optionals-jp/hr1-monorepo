"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { MessageSquare, ChevronRight } from "lucide-react";
import { useFaq, useFaqs } from "@/lib/hooks/use-faqs";

const TARGET_LABELS: Record<string, string> = {
  employee: "社員のみ",
  both: "社員・応募者",
};

export default function FaqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: faq, isLoading, error, mutate } = useFaq(id);
  const { data: allFaqs = [] } = useFaqs();

  const related = faq
    ? allFaqs.filter((f) => f.id !== faq.id && f.category === faq.category).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader
        title={isLoading ? "読み込み中..." : (faq?.question ?? "FAQ")}
        breadcrumb={[{ label: "よくある質問", href: "/faqs" }]}
        sticky={false}
        border={false}
      />
      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : !faq ? null : (
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <CardTitle className="text-base leading-relaxed">{faq.question}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{faq.category}</Badge>
                      <Badge variant="secondary">{TARGET_LABELS[faq.target] ?? faq.target}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {faq.answer}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">解決しませんでしたか？</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      担当者にメッセージで問い合わせることができます
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/messages")}
                    className="shrink-0"
                  >
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    問い合わせる
                  </Button>
                </div>
              </CardContent>
            </Card>

            {related.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-1">同じカテゴリのFAQ</p>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {related.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => router.push(`/faqs/${f.id}`)}
                      >
                        <span className="flex-1 text-sm">{f.question}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </div>
  );
}
