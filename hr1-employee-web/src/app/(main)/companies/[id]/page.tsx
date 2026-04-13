"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
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
import { Pencil, Building2, Users, Handshake, ScrollText } from "lucide-react";
import { CompanyEditPanel } from "./company-edit-panel";

const tabs = [
  { value: "overview", label: "概要", icon: Building2 },
  { value: "contacts", label: "連絡先", icon: Users },
  { value: "deals", label: "商談", icon: Handshake },
  { value: "activity", label: "活動ログ", icon: ScrollText },
];

export default function CrmCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(`/companies/${id}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, id, searchParams]
  );

  const { data: company, error, mutate } = useCrmCompany(id);
  const { data: contacts } = useCrmCompanyContacts(id);
  const { data: deals } = useCrmCompanyDeals(id);
  const { data: activities, mutate: mutateActivities } = useCrmCompanyActivities(id);

  const [contactSearch, setContactSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!contactSearch) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        `${c.last_name}${c.first_name ?? ""}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    if (!dealSearch) return deals;
    const q = dealSearch.toLowerCase();
    return deals.filter((d) => d.title.toLowerCase().includes(q));
  }, [deals, dealSearch]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={company?.name ?? "企業詳細"}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "取引先企業", href: "/companies" }]}
        action={
          company ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              編集
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {company && activeTab === "overview" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard className="self-start">
              <h2 className="text-sm font-semibold mb-4">基本情報</h2>
              <div className="space-y-4 text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">企業名</span>
                  <span className="font-medium">{company.name}</span>
                </div>
                {company.name_kana && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">カナ</span>
                    <span>{company.name_kana}</span>
                  </div>
                )}
                {company.corporate_number && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">法人番号</span>
                    <span>{company.corporate_number}</span>
                  </div>
                )}
                {company.industry && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">業種</span>
                    <span>{company.industry}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">電話番号</span>
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.address && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">住所</span>
                    <span>{company.address}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">Webサイト</span>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">登録日</span>
                  <span>{new Date(company.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">更新日</span>
                  <span>{new Date(company.updated_at).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>

              {company.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    メモ
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
                </div>
              )}

              <CrmCustomFields entityId={company.id} entityType="company" />
            </SectionCard>

            <div className="lg:col-span-2 space-y-6">
              <SectionCard>
                <h2 className="text-sm font-semibold mb-3">サマリー</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">連絡先</span>
                    </div>
                    <span className="text-2xl font-bold">{contacts?.length ?? 0}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Handshake className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">商談</span>
                    </div>
                    <span className="text-2xl font-bold">{deals?.length ?? 0}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ScrollText className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">活動</span>
                    </div>
                    <span className="text-2xl font-bold">{activities?.length ?? 0}</span>
                  </div>
                </div>
              </SectionCard>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">
                    連絡先
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {contacts?.length ?? 0}
                    </span>
                  </h2>
                  {(contacts?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("contacts")}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      すべて表示
                    </button>
                  )}
                </div>
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
                      (contacts ?? []).slice(0, 5).map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/contacts/${c.id}`)}
                        >
                          <TableCell className="font-medium">
                            {c.last_name} {c.first_name ?? ""}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {[c.department, c.position].filter(Boolean).join(" / ") || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">
                    商談
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {deals?.length ?? 0}
                    </span>
                  </h2>
                  {(deals?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("deals")}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      すべて表示
                    </button>
                  )}
                </div>
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
                      (deals ?? []).slice(0, 5).map((deal) => (
                        <TableRow
                          key={deal.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/deals/${deal.id}`)}
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

              <SectionCard>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">
                    直近の活動
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {activities?.length ?? 0}
                    </span>
                  </h2>
                  {(activities?.length ?? 0) > 3 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      すべて表示
                    </button>
                  )}
                </div>
                <ActivityTimeline activities={(activities ?? []).slice(0, 3).reverse()} />
                <ActivityInputBar companyId={id} onAdded={() => mutateActivities()} />
              </SectionCard>
            </div>
          </div>
        </PageContent>
      )}

      {company && activeTab === "contacts" && (
        <>
          <SearchBar
            value={contactSearch}
            onChange={setContactSearch}
            placeholder="氏名・メール・部署で検索"
          />
          <PageContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>氏名</TableHead>
                  <TableHead>部署・役職</TableHead>
                  <TableHead>メール</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      {contactSearch ? "該当する連絡先がありません" : "連絡先なし"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/contacts/${c.id}`)}
                    >
                      <TableCell className="font-medium">
                        {c.last_name} {c.first_name ?? ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[c.department, c.position].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </PageContent>
        </>
      )}

      {company && activeTab === "deals" && (
        <>
          <SearchBar value={dealSearch} onChange={setDealSearch} placeholder="商談名で検索" />
          <PageContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商談名</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      {dealSearch ? "該当する商談がありません" : "商談なし"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
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
          </PageContent>
        </>
      )}

      {company && activeTab === "activity" && (
        <PageContent>
          <div className="max-w-3xl">
            <ActivityTimeline activities={activities ?? []} />
            <ActivityInputBar companyId={id} onAdded={() => mutateActivities()} />
          </div>
        </PageContent>
      )}

      {company && (
        <CompanyEditPanel
          company={company}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
