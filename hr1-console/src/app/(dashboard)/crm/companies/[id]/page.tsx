"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InfoItem } from "@/components/ui/info-item";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants";
import Link from "next/link";
import { useCrmCompany, useCrmCompanyContacts, useCrmCompanyDeals } from "@/lib/hooks/use-crm";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";

export default function CrmCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: company, error } = useCrmCompany(id);
  const { data: contacts } = useCrmCompanyContacts(id);
  const { data: deals } = useCrmCompanyDeals(id);

  return (
    <div>
      <PageHeader
        title={company?.name ?? "企業詳細"}
        breadcrumb={[{ label: "取引先企業", href: "/crm/companies" }]}
      />
      {error && <QueryErrorBanner error={error} />}

      {company && (
        <div className="space-y-8">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem label="企業名" value={company.name} />
            <InfoItem label="企業名（カナ）" value={company.name_kana} />
            <InfoItem label="法人番号" value={company.corporate_number} />
            <InfoItem label="電話番号" value={company.phone} />
            <InfoItem label="住所" value={company.address} />
            <InfoItem label="Webサイト" value={company.website} />
            <InfoItem label="業種" value={company.industry} />
          </div>

          {/* カスタムフィールド */}
          <CrmCustomFields entityId={company.id} entityType="company" mode="view" />

          {/* 連絡先 */}
          <div>
            <h2 className="text-lg font-semibold mb-3">連絡先（{contacts?.length ?? 0}名）</h2>
            <div className="space-y-2">
              {(contacts ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={`/crm/contacts/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">
                      {c.last_name} {c.first_name ?? ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[c.department, c.position].filter(Boolean).join(" / ") || "—"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.email ?? "—"}</p>
                </Link>
              ))}
              {(contacts ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">連絡先なし</p>
              )}
            </div>
          </div>

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
                  <div className="flex items-center gap-2">
                    {deal.amount != null && (
                      <span className="text-sm">¥{deal.amount.toLocaleString()}</span>
                    )}
                    <Badge variant={dealStatusColors[deal.status]}>
                      {dealStatusLabels[deal.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
              {(deals ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">商談なし</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
