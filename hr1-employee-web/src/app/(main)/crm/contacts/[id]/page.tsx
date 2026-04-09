"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { dealStatusLabels, dealStatusColors } from "@/lib/constants";
import Link from "next/link";
import {
  useCrmContact,
  useCrmContactDeals,
  useCrmContactActivities,
  useCrmContactCards,
} from "@/lib/hooks/use-crm";
import { CrmCustomFields } from "@/components/crm/crm-custom-fields";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { MessageSquare, Pencil } from "lucide-react";
import { ContactEditPanel } from "./contact-edit-panel";

export default function CrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data: contact, error, mutate } = useCrmContact(id);
  const { data: deals } = useCrmContactDeals(id);
  const { data: activities, mutate: mutateActivities } = useCrmContactActivities(id);
  const { data: cards } = useCrmContactCards(id);

  const fullName = contact ? `${contact.last_name} ${contact.first_name ?? ""}` : "連絡先詳細";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={fullName}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "連絡先", href: "/crm/contacts" }]}
        action={
          contact ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              編集
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} />}

      {contact && (
        <PageContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ===== 左カラム (2/3) ===== */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">氏名</span>
                    <span className="font-medium">{fullName}</span>
                  </div>
                  {contact.last_name_kana && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">カナ</span>
                      <span>
                        {contact.last_name_kana} {contact.first_name_kana ?? ""}
                      </span>
                    </div>
                  )}
                  {contact.bc_companies && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">企業</span>
                      <Link
                        href={`/crm/companies/${contact.company_id}`}
                        className="text-primary hover:underline"
                      >
                        {contact.bc_companies.name}
                      </Link>
                    </div>
                  )}
                  {contact.department && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">部署</span>
                      <span>{contact.department}</span>
                    </div>
                  )}
                  {contact.position && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">役職</span>
                      <span>{contact.position}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">メール</span>
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">電話</span>
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.mobile_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">携帯</span>
                      <span>{contact.mobile_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* カスタムフィールド */}
              <CrmCustomFields entityId={contact.id} entityType="contact" />

              {/* 名刺画像 */}
              {(cards ?? []).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>名刺画像</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

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
                <ActivityInputBar
                  contactId={contact.id}
                  companyId={contact.company_id ?? undefined}
                  onAdded={() => mutateActivities()}
                />
              </div>
            </div>

            {/* ===== 右カラム (1/3) ===== */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">登録情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>登録日: {new Date(contact.created_at).toLocaleDateString("ja-JP")}</p>
                  <p>更新日: {new Date(contact.updated_at).toLocaleDateString("ja-JP")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContent>
      )}

      {contact && (
        <ContactEditPanel
          contact={contact}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
