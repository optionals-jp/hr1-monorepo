import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { RefreshCw, Building2, Target } from "lucide-react";
import type { BcLead } from "@/types/database";

export function LeadConvertedCard({
  lead,
  onCompanyClick,
  onDealClick,
}: {
  lead: BcLead;
  onCompanyClick: () => void;
  onDealClick: () => void;
}) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="size-5 text-green-600" />
          <span className="font-medium text-green-800">コンバート済</span>
          <span className="text-sm text-green-600">{lead.converted_at?.slice(0, 10)}</span>
        </div>
        <div className="flex items-center gap-4">
          {lead.converted_company_id && (
            <Button variant="outline" size="sm" onClick={onCompanyClick}>
              <Building2 className="size-4 mr-1" />
              企業を表示
            </Button>
          )}
          {lead.converted_deal_id && (
            <Button variant="outline" size="sm" onClick={onDealClick}>
              <Target className="size-4 mr-1" />
              商談を表示
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
