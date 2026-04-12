import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { Building2, User, Mail, Phone } from "lucide-react";
import type { BcLead } from "@/types/database";

export function LeadInfoCard({ lead }: { lead: BcLead }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">企業名</p>
            <p className="font-medium flex items-center gap-1.5 mt-1">
              <Building2 className="size-4 text-muted-foreground" />
              {lead.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ステータス</p>
            <Badge variant={leadStatusColors[lead.status] ?? "default"} className="mt-1">
              {leadStatusLabels[lead.status] ?? lead.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ソース</p>
            <Badge variant="secondary" className="mt-1">
              {leadSourceLabels[lead.source] ?? lead.source}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">担当者名</p>
            <p className="text-sm mt-1 flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              {lead.contact_name ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">メール</p>
            {lead.contact_email ? (
              <a
                href={`mailto:${lead.contact_email}`}
                className="text-sm text-blue-600 hover:underline mt-1 flex items-center gap-1.5"
              >
                <Mail className="size-3.5" />
                {lead.contact_email}
              </a>
            ) : (
              <p className="text-sm mt-1">{"\u2014"}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">電話</p>
            <p className="text-sm mt-1 flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground" />
              {lead.contact_phone ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">営業担当</p>
            <p className="text-sm mt-1">
              {lead.profiles?.display_name ?? lead.profiles?.email ?? "未割当"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">作成日</p>
            <p className="text-sm mt-1">{lead.created_at.slice(0, 10)}</p>
          </div>
          {lead.notes && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">メモ</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
