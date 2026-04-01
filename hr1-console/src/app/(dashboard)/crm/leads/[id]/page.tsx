"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { useCrmLead, useCrmLeadActivities } from "@/lib/hooks/use-crm";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import Link from "next/link";
import {
  ArrowRightLeft,
  Building2,
  Contact,
  Handshake,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

export default function CrmLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: lead, error } = useCrmLead(id);
  const { data: activities, mutate: mutateActivities } = useCrmLeadActivities(id);

  const callCount = (activities ?? []).filter((a) => a.activity_type === "call").length;
  const emailCount = (activities ?? []).filter((a) => a.activity_type === "email").length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={lead?.name ?? "リード詳細"}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "リード管理", href: "/crm/leads" }]}
        action={
          lead?.status !== "converted" ? (
            <Button variant="outline" onClick={() => router.push(`/crm/leads?convert=${lead?.id}`)}>
              <ArrowRightLeft className="size-4 mr-1.5" />
              コンバート
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} />}

      {lead && (
        <PageContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ===== 左カラム (2/3): 基本情報 + 活動ログ ===== */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本情報 */}
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>基本情報</CardTitle>
                  <Badge variant={leadStatusColors[lead.status]}>
                    {leadStatusLabels[lead.status] ?? lead.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">企業名</span>
                    <span className="font-medium">{lead.name}</span>
                  </div>
                  {lead.contact_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">担当者名</span>
                      <span>{lead.contact_name}</span>
                    </div>
                  )}
                  {lead.contact_email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">担当者メール</span>
                      <span>{lead.contact_email}</span>
                    </div>
                  )}
                  {lead.contact_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">担当者電話</span>
                      <span>{lead.contact_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ソース</span>
                    <span>{leadSourceLabels[lead.source] ?? lead.source}</span>
                  </div>
                  {lead.profiles && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">割当</span>
                      <span>{lead.profiles.display_name ?? lead.profiles.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">登録日</span>
                    <span>{format(new Date(lead.created_at), "yyyy/MM/dd HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* メモ */}
              {lead.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>メモ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* 活動ログ + 入力バー */}
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <MessageSquare className="size-4" />
                  活動ログ（{activities?.length ?? 0}件）
                </h2>
                <ActivityTimeline activities={activities ?? []} />
                <ActivityInputBar leadId={id} onAdded={() => mutateActivities()} />
              </div>
            </div>

            {/* ===== 右カラム (1/3): サマリー + コンバート ===== */}
            <div className="space-y-4">
              {/* 活動サマリー */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">活動サマリー</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-4" />
                      電話
                    </span>
                    <span className="font-medium">{callCount}回</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-4" />
                      メール
                    </span>
                    <span className="font-medium">{emailCount}回</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="size-4" />
                      合計
                    </span>
                    <span className="font-medium">{activities?.length ?? 0}回</span>
                  </div>
                </CardContent>
              </Card>

              {/* コンバート結果 */}
              {lead.status === "converted" && lead.converted_at && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">コンバート結果</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lead.converted_at), "yyyy/MM/dd HH:mm")} にコンバート
                    </p>
                    {lead.converted_company_id && (
                      <Link
                        href={`/crm/companies/${lead.converted_company_id}`}
                        className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">企業</span>
                      </Link>
                    )}
                    {lead.converted_contact_id && (
                      <Link
                        href={`/crm/contacts/${lead.converted_contact_id}`}
                        className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <Contact className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">連絡先</span>
                      </Link>
                    )}
                    {lead.converted_deal_id && (
                      <Link
                        href={`/crm/deals/${lead.converted_deal_id}`}
                        className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <Handshake className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">商談</span>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* コンバートアクション */}
              {lead.status !== "converted" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">アクション</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/crm/leads?convert=${lead.id}`)}
                    >
                      <ArrowRightLeft className="size-4 mr-1.5" />
                      コンバート
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">企業・商談を作成します</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </PageContent>
      )}
    </div>
  );
}
