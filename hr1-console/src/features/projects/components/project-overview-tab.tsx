"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { DetailField } from "@hr1/shared-ui/components/ui/detail-field";
import { projectStatusLabels, projectStatusColors } from "@/lib/constants";
import { format } from "date-fns";
import type { Project } from "@/types/database";

interface ProjectOverviewTabProps {
  project: Project;
  teamCount: number;
  totalMembers: number;
  onEdit: () => void;
}

export function ProjectOverviewTab({
  project,
  teamCount,
  totalMembers,
  onEdit,
}: ProjectOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <SectionCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">プロジェクト情報</h2>
          <Button variant="outline" size="xs" onClick={onEdit}>
            編集
          </Button>
        </div>
        <div className="space-y-4">
          <DetailField label="プロジェクト名">{project.name}</DetailField>
          <DetailField label="ステータス">
            <Badge variant={projectStatusColors[project.status]}>
              {projectStatusLabels[project.status]}
            </Badge>
          </DetailField>
          <DetailField label="チーム数">{teamCount}</DetailField>
          <DetailField label="総メンバー数">{totalMembers} 名</DetailField>
          {project.start_date && (
            <DetailField label="開始日">
              {format(new Date(project.start_date), "yyyy/MM/dd")}
            </DetailField>
          )}
          {project.end_date && (
            <DetailField label="終了日">
              {format(new Date(project.end_date), "yyyy/MM/dd")}
            </DetailField>
          )}
          <DetailField label="作成日">
            {format(new Date(project.created_at), "yyyy/MM/dd")}
          </DetailField>
        </div>
        {project.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              説明
            </p>
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
