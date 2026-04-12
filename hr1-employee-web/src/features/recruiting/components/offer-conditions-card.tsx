"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { format } from "date-fns";
import type { Offer } from "@/types/database";
import { FileText, Calendar, Building2, Banknote, Clock } from "lucide-react";

interface OfferConditionsCardProps {
  offer: Offer;
  applicationStatus: string;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span>{value}</span>
      </div>
    </div>
  );
}

export function OfferConditionsCard({ offer, applicationStatus }: OfferConditionsCardProps) {
  const statusBadge =
    applicationStatus === "offer_accepted" ? (
      <Badge variant="default">承諾済み</Badge>
    ) : applicationStatus === "offer_declined" ? (
      <Badge variant="destructive">辞退</Badge>
    ) : (
      <Badge variant="secondary">回答待ち</Badge>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">内定条件</CardTitle>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <InfoRow icon={Banknote} label="年収・給与" value={offer.salary} />
        <InfoRow
          icon={Calendar}
          label="入社予定日"
          value={offer.start_date ? format(new Date(offer.start_date), "yyyy/MM/dd") : null}
        />
        <InfoRow icon={Building2} label="配属先" value={offer.department} />
        <InfoRow
          icon={Clock}
          label="回答期限"
          value={offer.expires_at ? format(new Date(offer.expires_at), "yyyy/MM/dd") : null}
        />
        {offer.notes && (
          <div className="text-sm pt-1">
            <FileText className="h-4 w-4 text-muted-foreground inline mr-1" />
            <span className="text-muted-foreground">備考: </span>
            <span className="whitespace-pre-wrap">{offer.notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
