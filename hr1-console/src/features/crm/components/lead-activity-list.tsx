import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { activityTypeLabels } from "@/lib/constants/crm";
import { Plus, Phone, Mail, Calendar, MapPin, FileText } from "lucide-react";
import type { BcActivity } from "@/types/database";

const activityIcon = (type: string) => {
  switch (type) {
    case "call":
      return <Phone className="size-4" />;
    case "email":
      return <Mail className="size-4" />;
    case "appointment":
      return <Calendar className="size-4" />;
    case "visit":
      return <MapPin className="size-4" />;
    default:
      return <FileText className="size-4" />;
  }
};

export function LeadActivityList({
  activities,
  onAddClick,
}: {
  activities: BcActivity[] | undefined;
  onAddClick: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">活動履歴</h3>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="size-4 mr-1" />
          活動を記録
        </Button>
      </div>
      {!activities || activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">活動履歴がありません</p>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                {activityIcon(act.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{act.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {activityTypeLabels[act.activity_type] ?? act.activity_type}
                  </Badge>
                </div>
                {act.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {act.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {act.activity_date?.slice(0, 10) ?? act.created_at.slice(0, 10)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
