"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useMyProjects } from "@/lib/hooks/use-my-projects";
import { FolderKanban } from "lucide-react";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  active: "進行中",
  completed: "完了",
  archived: "アーカイブ",
};

export default function ProjectsPage() {
  const { data: projects = [], isLoading, error, mutate } = useMyProjects();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="プロジェクト"
        description="参加中のプロジェクト"
        sticky={false}
        border={false}
      />
      {error && <QueryErrorBanner error={error} onRetry={() => mutate()} />}

      <PageContent>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <FolderKanban className="h-10 w-10 opacity-40" />
            <p className="text-sm">参加中のプロジェクトはありません</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
            {projects.map((project) => (
              <Card key={project.id} className="transition-colors hover:bg-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold truncate">{project.name}</CardTitle>
                    <Badge
                      variant={project.status === "active" ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {statusLabels[project.status] ?? project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    {project.start_date && (
                      <span>開始: {format(new Date(project.start_date), "yyyy/MM/dd")}</span>
                    )}
                    {project.end_date && (
                      <span>終了: {format(new Date(project.end_date), "yyyy/MM/dd")}</span>
                    )}
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
