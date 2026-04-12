import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { activityTypeLabels } from "@/lib/constants/crm";
import { fmtDate } from "@/features/crm/components/detail-helpers";
import { Mail, User } from "lucide-react";
import type { BcActivity } from "@/types/database";

interface Props {
  activities: BcActivity[] | undefined;
  /** 担当者名を表示するか（企業詳細画面では表示） */
  showAssignee?: boolean;
}

export function ActivityList({ activities, showAssignee = false }: Props) {
  return (
    <SectionCard>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        活動履歴
        {activities && activities.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {activities.length}
          </Badge>
        )}
      </h2>
      {!activities ? (
        <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">活動履歴がありません</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {activityTypeLabels[a.activity_type] ?? a.activity_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmtDate(a.activity_date ?? a.created_at)}
                  </span>
                </div>
                <p className="text-sm font-medium">{a.title}</p>
                {a.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                )}
                {showAssignee && a.profiles?.display_name && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {a.profiles.display_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
