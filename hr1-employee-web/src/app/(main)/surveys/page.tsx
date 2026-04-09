"use client";

import Link from "next/link";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useActiveSurveys } from "@/lib/hooks/use-surveys";
import { HeartPulse, ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default function SurveysPage() {
  const { data: surveys = [], isLoading, error, mutate } = useActiveSurveys();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="サーベイ"
        description="回答可能なアンケート"
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <HeartPulse className="h-10 w-10 opacity-40" />
            <p className="text-sm">回答可能なサーベイはありません</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {surveys.map((survey) => (
              <Card key={survey.id} className="transition-colors hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold truncate">{survey.title}</CardTitle>
                    <Badge variant="default" className="text-[10px] shrink-0">
                      受付中
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {survey.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {survey.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" />
                        {survey.question_count ?? 0}問
                      </span>
                      {survey.deadline && (
                        <span>期限: {format(new Date(survey.deadline), "M/d")}</span>
                      )}
                    </div>
                    <Link href={`/surveys/${survey.id}`}>
                      <Button size="sm" variant="outline">
                        回答する
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContent>
    </div>
  );
}
