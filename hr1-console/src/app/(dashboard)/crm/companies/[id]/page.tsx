"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants";
import {
  useCrmCompany,
  useCrmCompanyContacts,
  useCrmCompanyDeals,
  useCrmCompanyActivities,
} from "@/lib/hooks/use-crm";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { MessageSquare } from "lucide-react";

export default function CrmCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: company, error } = useCrmCompany(id);
  const { data: contacts } = useCrmCompanyContacts(id);
  const { data: deals } = useCrmCompanyDeals(id);
  const { data: activities, mutate: mutateActivities } = useCrmCompanyActivities(id);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={company?.name ?? "企業詳細"}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "取引先企業", href: "/crm/companies" }]}
      />
      {error && <QueryErrorBanner error={error} />}

      {company && (
        <>
          <PageContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ===== 左カラム (2/3): 基本情報・連絡先・商談 ===== */}
              <div className="lg:col-span-2 space-y-6">
                {/* 基本情報 */}
                <Card>
                  <CardHeader>
                    <CardTitle>基本情報</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">企業名</span>
                      <span className="font-medium">{company.name}</span>
                    </div>
                    {company.name_kana && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">カナ</span>
                        <span>{company.name_kana}</span>
                      </div>
                    )}
                    {company.corporate_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">法人番号</span>
                        <span>{company.corporate_number}</span>
                      </div>
                    )}
                    {company.industry && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">業種</span>
                        <span>{company.industry}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">電話番号</span>
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">住所</span>
                        <span className="text-right max-w-[60%]">{company.address}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Webサイト</span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-[60%]"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* カスタムフィールド */}
                <CrmCustomFields entityId={company.id} entityType="company" />

                {/* 連絡先 */}
                <div>
                  <h2 className="text-sm font-semibold mb-2">
                    連絡先（{contacts?.length ?? 0}名）
                  </h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>氏名</TableHead>
                        <TableHead>部署・役職</TableHead>
                        <TableHead>メール</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(contacts ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            連絡先なし
                          </TableCell>
                        </TableRow>
                      ) : (
                        (contacts ?? []).map((c) => (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/crm/contacts/${c.id}`)}
                          >
                            <TableCell className="font-medium">
                              {c.last_name} {c.first_name ?? ""}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {[c.department, c.position].filter(Boolean).join(" / ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {c.email ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 商談 */}
                <div>
                  <h2 className="text-sm font-semibold mb-2">商談（{deals?.length ?? 0}件）</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商談名</TableHead>
                        <TableHead>金額</TableHead>
                        <TableHead>ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(deals ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            商談なし
                          </TableCell>
                        </TableRow>
                      ) : (
                        (deals ?? []).map((deal) => (
                          <TableRow
                            key={deal.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/crm/deals/${deal.id}`)}
                          >
                            <TableCell className="font-medium">{deal.title}</TableCell>
                            <TableCell>
                              {deal.amount != null ? `¥${deal.amount.toLocaleString()}` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={dealStatusColors[deal.status]}>
                                {dealStatusLabels[deal.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* 活動ログ + 入力バー */}
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare className="size-4" />
                    活動ログ（{activities?.length ?? 0}件）
                  </h2>
                  <ActivityTimeline activities={activities ?? []} emptyMessage="活動なし" />
                  <ActivityInputBar companyId={id} onAdded={() => mutateActivities()} />
                </div>
              </div>
            </div>
          </PageContent>
        </>
      )}
    </div>
  );
}
