"use client";

import { useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useAnnouncements } from "@/lib/hooks/use-announcements";
import { cn } from "@hr1/shared-ui/lib/utils";
import { Pin, Megaphone, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading, error, mutate } = useAnnouncements();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <PageHeader title="お知らせ" description="社内のお知らせ" sticky={false} border={false} />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Megaphone className="h-10 w-10 opacity-40" />
            <p className="text-sm">お知らせはありません</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {announcements.map((a) => {
              const isExpanded = expandedId === a.id;
              return (
                <Card
                  key={a.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent/30",
                    a.is_pinned && "border-primary/30"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <CardTitle className="text-sm font-semibold truncate">{a.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.is_pinned && (
                          <Badge variant="default" className="text-[10px]">
                            固定
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {a.published_at && format(new Date(a.published_at), "yyyy/MM/dd")}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isExpanded ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {a.body}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">{a.body}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>
    </div>
  );
}
