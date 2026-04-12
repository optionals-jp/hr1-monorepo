import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { leadStatusLabels } from "@/lib/constants/crm";
import { ArrowRight } from "lucide-react";
import type { BcLead } from "@/types/database";

const statusFlow = ["new", "contacted", "qualified", "unqualified"];

export function LeadStatusFlow({
  lead,
  onStatusChange,
}: {
  lead: BcLead;
  onStatusChange: (status: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">ステータス変更</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          {statusFlow.map((status, i) => (
            <div key={status} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="size-4 text-muted-foreground" />}
              <Button
                size="sm"
                variant={lead.status === status ? "default" : "outline"}
                onClick={() => onStatusChange(status)}
                disabled={lead.status === status}
              >
                {leadStatusLabels[status]}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
