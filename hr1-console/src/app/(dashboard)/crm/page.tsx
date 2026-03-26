"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { dealStatusLabels, dealStatusColors, dealStageLabels } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { BcDeal } from "@/types/database";

export default function CrmDashboardPage() {
  const { organization } = useOrg();

  const { data: deals, error: dealsError } = useQuery<BcDeal[]>(
    organization ? `crm-deals-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("bc_deals")
        .select("*, bc_companies(*), bc_contacts(*)")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  const { data: companies } = useQuery<{ id: string }[]>(
    organization ? `crm-companies-count-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("bc_companies")
        .select("id")
        .eq("organization_id", organization!.id);
      return data ?? [];
    }
  );

  const { data: contacts } = useQuery<{ id: string }[]>(
    organization ? `crm-contacts-count-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("bc_contacts")
        .select("id")
        .eq("organization_id", organization!.id);
      return data ?? [];
    }
  );

  const openDeals = deals?.filter((d) => d.status === "open") ?? [];
  const wonDeals = deals?.filter((d) => d.status === "won") ?? [];
  const totalAmount = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const wonAmount = wonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const formatAmount = (amount: number) => `¥${amount.toLocaleString()}`;

  return (
    <div>
      <PageHeader title="CRMダッシュボード" />
      {dealsError && <QueryErrorBanner error={dealsError} />}

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link
          href="/crm/companies"
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="text-sm text-muted-foreground">取引先企業</p>
          <p className="text-2xl font-bold">{companies?.length ?? 0}</p>
        </Link>
        <Link
          href="/crm/contacts"
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="text-sm text-muted-foreground">連絡先</p>
          <p className="text-2xl font-bold">{contacts?.length ?? 0}</p>
        </Link>
        <Link
          href="/crm/deals"
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="text-sm text-muted-foreground">商談中</p>
          <p className="text-2xl font-bold">{openDeals.length}</p>
          <p className="text-xs text-muted-foreground">{formatAmount(totalAmount)}</p>
        </Link>
        <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
          <p className="text-sm text-muted-foreground">受注</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{wonDeals.length}</p>
          <p className="text-xs text-muted-foreground">{formatAmount(wonAmount)}</p>
        </div>
      </div>

      {/* 最近の商談 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近の商談</h2>
          <Link href="/crm/deals" className="text-sm text-primary hover:underline">
            すべて表示
          </Link>
        </div>
        <div className="space-y-2">
          {(deals ?? []).slice(0, 5).map((deal) => (
            <Link
              key={deal.id}
              href={`/crm/deals/${deal.id}`}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium">{deal.title}</p>
                <p className="text-sm text-muted-foreground">
                  {deal.bc_companies?.name ?? "—"} / {dealStageLabels[deal.stage] ?? deal.stage}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {deal.amount != null && (
                  <span className="text-sm font-medium">{formatAmount(deal.amount)}</span>
                )}
                <Badge variant={dealStatusColors[deal.status]}>
                  {dealStatusLabels[deal.status] ?? deal.status}
                </Badge>
              </div>
            </Link>
          ))}
          {(deals ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">まだ商談がありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
