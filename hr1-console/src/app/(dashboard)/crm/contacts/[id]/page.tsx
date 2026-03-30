"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InfoItem } from "@/components/ui/info-item";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants";
import Link from "next/link";
import {
  useCrmContact,
  useCrmContactDeals,
  useCrmContactActivities,
  useCrmContactCards,
} from "@/lib/hooks/use-crm";

export default function CrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, error } = useCrmContact(id);
  const { data: deals } = useCrmContactDeals(id);
  const { data: activities } = useCrmContactActivities(id);
  const { data: cards } = useCrmContactCards(id);

  const fullName = contact ? `${contact.last_name} ${contact.first_name ?? ""}` : "連絡先詳細";

  return (
    <div>
      <PageHeader title={fullName} breadcrumb={[{ label: "連絡先", href: "/crm/contacts" }]} />
      {error && <QueryErrorBanner error={error} />}

      {contact && (
        <div className="space-y-8">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem label="氏名" value={fullName} />
            <InfoItem
              label="氏名（カナ）"
              value={
                contact.last_name_kana
                  ? `${contact.last_name_kana} ${contact.first_name_kana ?? ""}`
                  : null
              }
            />
            <InfoItem label="企業" value={contact.bc_companies?.name} />
            <InfoItem label="部署" value={contact.department} />
            <InfoItem label="役職" value={contact.position} />
            <InfoItem label="メール" value={contact.email} />
            <InfoItem label="電話" value={contact.phone} />
            <InfoItem label="携帯" value={contact.mobile_phone} />
          </div>

          {/* 名刺画像 */}
          {(cards ?? []).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">名刺画像</h2>
              <div className="flex gap-4 flex-wrap">
                {cards!.map((card) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={card.id}
                    src={card.image_url}
                    alt="名刺"
                    className="w-64 rounded-lg border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 商談 */}
          <div>
            <h2 className="text-lg font-semibold mb-3">商談（{deals?.length ?? 0}件）</h2>
            <div className="space-y-2">
              {(deals ?? []).map((deal) => (
                <Link
                  key={deal.id}
                  href={`/crm/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium">{deal.title}</p>
                  <Badge variant={dealStatusColors[deal.status]}>
                    {dealStatusLabels[deal.status]}
                  </Badge>
                </Link>
              ))}
              {(deals ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">商談なし</p>
              )}
            </div>
          </div>

          {/* 活動 */}
          <div>
            <h2 className="text-lg font-semibold mb-3">活動履歴（{activities?.length ?? 0}件）</h2>
            <div className="space-y-2">
              {(activities ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="outline">
                      {activityTypeLabels[a.activity_type] ?? a.activity_type}
                    </Badge>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  )}
                </div>
              ))}
              {(activities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">活動なし</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
