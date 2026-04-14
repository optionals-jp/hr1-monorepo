"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { rejectionCategoryLabels } from "@/lib/constants";
import { XCircle, FileText } from "lucide-react";

interface RejectionReasonCardProps {
  rejectionCategory?: string | null;
  rejectionReason?: string | null;
}

export function RejectionReasonCard({
  rejectionCategory,
  rejectionReason,
}: RejectionReasonCardProps) {
  if (!rejectionCategory && !rejectionReason) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">不採用理由</CardTitle>
          <Badge variant="destructive">不採用</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rejectionCategory && (
          <div className="flex items-start gap-2 text-sm">
            <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-muted-foreground">カテゴリ: </span>
              <span>{rejectionCategoryLabels[rejectionCategory] ?? rejectionCategory}</span>
            </div>
          </div>
        )}
        {rejectionReason && (
          <div className="text-sm pt-1">
            <FileText className="h-4 w-4 text-muted-foreground inline mr-1" />
            <span className="text-muted-foreground">理由: </span>
            <span className="whitespace-pre-wrap">{rejectionReason}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
