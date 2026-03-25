"use client";

import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import {
  contractStatusLabels,
  contractStatusColors,
  contractChangeTypeLabels,
} from "@/lib/constants";
import type { Organization, Contract, ContractChange } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const {
    data: org,
    error: orgError,
    mutate: mutateOrg,
  } = useQuery<Organization | null>(`admin-org-${id}`, async () => {
    const { data } = await getSupabase()
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();
    return data as Organization | null;
  });

  const { data: contracts } = useQuery<Contract[]>(
    `admin-org-contracts-${id}`,
    async () => {
      const { data } = await getSupabase()
        .from("contracts")
        .select("*, plans(*)")
        .eq("organization_id", id)
        .order("start_date", { ascending: false });
      return (data as Contract[]) ?? [];
    },
  );

  const { data: employeeCount } = useQuery<number>(
    `admin-org-employees-${id}`,
    async () => {
      const { count } = await getSupabase()
        .from("user_organizations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id);
      return count ?? 0;
    },
  );

  // 契約変更履歴
  const contractIds = (contracts ?? []).map((c) => c.id);
  const { data: changes } = useQuery<ContractChange[]>(
    contractIds.length > 0 ? `admin-org-changes-${id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("contract_changes")
        .select("*, profiles:changed_by(display_name, email)")
        .in("contract_id", contractIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as ContractChange[]) ?? [];
    },
  );

  const activeContract = contracts?.find(
    (c) => c.status === "active" || c.status === "trial",
  );

  return (
    <>
      <PageHeader
        title={org?.name ?? "読み込み中..."}
        description="企業詳細情報"
        breadcrumb={[{ label: "契約企業", href: "/organizations" }]}
      />
      <PageContent>
        <QueryErrorBanner error={orgError} onRetry={() => mutateOrg()} />

        <div className="space-y-6">
          {/* 企業基本情報 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">企業情報</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">業種</dt>
                  <dd>{org?.industry ?? "-"}</dd>
                  <dt className="text-muted-foreground">所在地</dt>
                  <dd>{org?.location ?? "-"}</dd>
                  <dt className="text-muted-foreground">設立年</dt>
                  <dd>{org?.founded_year ?? "-"}</dd>
                  <dt className="text-muted-foreground">Webサイト</dt>
                  <dd className="truncate">{org?.website_url ?? "-"}</dd>
                  <dt className="text-muted-foreground">実際の社員数</dt>
                  <dd className="font-medium">
                    {employeeCount?.toLocaleString() ?? "-"}名
                  </dd>
                </dl>
              </CardContent>
            </Card>

            {/* 現在の契約 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  現在の契約
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeContract ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <dt className="text-muted-foreground">プラン</dt>
                    <dd className="font-medium">
                      {activeContract.plans?.name ?? "-"}
                    </dd>
                    <dt className="text-muted-foreground">ステータス</dt>
                    <dd>
                      <Badge
                        variant={
                          contractStatusColors[activeContract.status] ??
                          "outline"
                        }
                      >
                        {contractStatusLabels[activeContract.status] ??
                          activeContract.status}
                      </Badge>
                    </dd>
                    <dt className="text-muted-foreground">契約社員数</dt>
                    <dd>
                      {activeContract.contracted_employees.toLocaleString()}名
                    </dd>
                    <dt className="text-muted-foreground">月額</dt>
                    <dd className="font-medium">
                      ¥{formatCurrency(activeContract.monthly_price)}
                    </dd>
                    <dt className="text-muted-foreground">契約開始日</dt>
                    <dd>
                      {new Date(activeContract.start_date).toLocaleDateString(
                        "ja-JP",
                      )}
                    </dd>
                    {activeContract.trial_end_date && (
                      <>
                        <dt className="text-muted-foreground">
                          トライアル終了
                        </dt>
                        <dd>
                          {new Date(
                            activeContract.trial_end_date,
                          ).toLocaleDateString("ja-JP")}
                        </dd>
                      </>
                    )}
                    {activeContract.notes && (
                      <>
                        <dt className="text-muted-foreground">備考</dt>
                        <dd className="col-span-1">{activeContract.notes}</dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    アクティブな契約がありません
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 契約変更履歴 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                契約変更履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {changes && changes.length > 0 ? (
                <div className="space-y-3">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {contractChangeTypeLabels[change.change_type] ??
                              change.change_type}
                          </Badge>
                          {change.notes && (
                            <span className="text-sm text-muted-foreground truncate">
                              {change.notes}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {change.profiles?.display_name ??
                            change.profiles?.email ??
                            "システム"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-4">
                        {new Date(change.created_at).toLocaleDateString(
                          "ja-JP",
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  変更履歴がありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
