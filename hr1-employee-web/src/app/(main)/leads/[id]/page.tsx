"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants";
import { useCrmLead, useCrmLeadActivities, useCrmCompanies } from "@/lib/hooks/use-crm";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { convertLead } from "@/lib/repositories/lead-repository";
import { fireTrigger } from "@/lib/automation/engine";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import { ActivityInputBar } from "@/components/crm/activity-input-bar";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { LeadConvertPanel } from "../lead-edit-panel";
import Link from "next/link";
import type { BcLead } from "@/types/database";
import {
  ArrowRightLeft,
  Building2,
  Contact,
  Handshake,
  MessageSquare,
  Phone,
  Mail,
  User,
  ScrollText,
} from "lucide-react";
import { format } from "date-fns";

const tabs = [
  { value: "overview", label: "概要", icon: User },
  { value: "activity", label: "活動ログ", icon: ScrollText },
];

export default function CrmLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { organization } = useOrg();

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
      router.replace(`/leads/${id}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, id, searchParams]
  );

  const { data: lead, error, mutate } = useCrmLead(id);
  const { data: activities, mutate: mutateActivities } = useCrmLeadActivities(id);
  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);
  const { data: existingCompanies } = useCrmCompanies();

  const callCount = (activities ?? []).filter((a) => a.activity_type === "call").length;
  const emailCount = (activities ?? []).filter((a) => a.activity_type === "email").length;

  // --- コンバートダイアログ ---
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertData, setConvertData] = useState({
    existingCompanyId: "",
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    dealTitle: "",
  });
  const [converting, setConverting] = useState(false);

  const openConvert = (l: BcLead) => {
    const match = (existingCompanies ?? []).find(
      (c) => c.name.trim().toLowerCase() === l.name.trim().toLowerCase()
    );
    setConvertData({
      existingCompanyId: match?.id ?? "",
      companyName: l.name,
      contactName: l.contact_name ?? "",
      contactEmail: l.contact_email ?? "",
      contactPhone: l.contact_phone ?? "",
      dealTitle: `${l.name} - 商談`,
    });
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!lead || !organization) return;
    const needsCompanyName = !convertData.existingCompanyId && !convertData.companyName;
    if (needsCompanyName || !convertData.dealTitle) {
      showToast("企業名と商談名は必須です", "error");
      return;
    }
    setConverting(true);
    try {
      const firstStage = stages[0];
      const useExisting = !!convertData.existingCompanyId;
      await convertLead(getSupabase(), lead.id, organization.id, {
        existingCompanyId: convertData.existingCompanyId || undefined,
        companyName: convertData.companyName,
        contactName: convertData.contactName || null,
        contactEmail: convertData.contactEmail || null,
        contactPhone: convertData.contactPhone || null,
        dealTitle: convertData.dealTitle,
        dealStageId: firstStage?.id,
        dealPipelineId: firstStage?.pipeline_id,
      });
      const hasContact = !!convertData.contactName;
      showToast(
        useExisting
          ? `商談に変換しました（既存企業に${hasContact ? "連絡先・" : ""}商談を作成）`
          : `商談に変換しました（企業${hasContact ? "・連絡先" : ""}・商談を作成）`
      );
      fireTrigger(getSupabase(), {
        organizationId: organization.id,
        triggerType: "lead_converted",
        entityType: "lead",
        entityId: lead.id,
        entityData: lead as unknown as Record<string, unknown>,
      }).catch(() => {});
      setConvertOpen(false);
      mutate();
    } catch {
      showToast("変換に失敗しました", "error");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title={lead?.name ?? "リード詳細"}
        sticky={false}
        border={false}
        breadcrumb={[{ label: "リード管理", href: "/leads" }]}
        action={
          lead?.status !== "converted" ? (
            <Button variant="outline" onClick={() => lead && openConvert(lead)}>
              <ArrowRightLeft className="size-4 mr-1.5" />
              商談に変換
            </Button>
          ) : undefined
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {lead && activeTab === "overview" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard className="self-start">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">リード情報</h2>
                <Badge variant={leadStatusColors[lead.status]}>
                  {leadStatusLabels[lead.status] ?? lead.status}
                </Badge>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">企業名</span>
                  <span className="font-medium">{lead.name}</span>
                </div>
                {lead.contact_name && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">担当者</span>
                    <span>{lead.contact_name}</span>
                  </div>
                )}
                {lead.contact_email && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">メール</span>
                    <span>{lead.contact_email}</span>
                  </div>
                )}
                {lead.contact_phone && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">電話</span>
                    <span>{lead.contact_phone}</span>
                  </div>
                )}
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">ソース</span>
                  <Badge variant="outline">{leadSourceLabels[lead.source] ?? lead.source}</Badge>
                </div>
                {lead.profiles && (
                  <div className="flex gap-8">
                    <span className="text-muted-foreground w-20 shrink-0">割当</span>
                    <span>{lead.profiles.display_name ?? lead.profiles.email}</span>
                  </div>
                )}
                <div className="flex gap-8">
                  <span className="text-muted-foreground w-20 shrink-0">登録日</span>
                  <span>{format(new Date(lead.created_at), "yyyy/MM/dd")}</span>
                </div>
              </div>

              {lead.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    メモ
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </SectionCard>

            <div className="lg:col-span-2 space-y-6">
              <SectionCard>
                <h2 className="text-sm font-semibold mb-3">活動サマリー</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">電話</span>
                    </div>
                    <span className="text-2xl font-bold">{callCount}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">メール</span>
                    </div>
                    <span className="text-2xl font-bold">{emailCount}</span>
                  </div>
                  <div className="rounded-xl bg-white border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">合計</span>
                    </div>
                    <span className="text-2xl font-bold">{activities?.length ?? 0}</span>
                  </div>
                </div>
              </SectionCard>

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
                <ActivityInputBar leadId={id} onAdded={() => mutateActivities()} />
              </SectionCard>

              {lead.status === "converted" && lead.converted_at && (
                <SectionCard>
                  <h2 className="text-sm font-semibold mb-3">変換結果</h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    {format(new Date(lead.converted_at), "yyyy/MM/dd HH:mm")} に変換
                  </p>
                  <div className="space-y-2">
                    {lead.converted_company_id && (
                      <Link
                        href={`/companies/${lead.converted_company_id}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:bg-muted/50 transition-colors"
                      >
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">企業</span>
                      </Link>
                    )}
                    {lead.converted_contact_id && (
                      <Link
                        href={`/contacts/${lead.converted_contact_id}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:bg-muted/50 transition-colors"
                      >
                        <Contact className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">連絡先</span>
                      </Link>
                    )}
                    {lead.converted_deal_id && (
                      <Link
                        href={`/deals/${lead.converted_deal_id}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border hover:bg-muted/50 transition-colors"
                      >
                        <Handshake className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">商談</span>
                      </Link>
                    )}
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        </PageContent>
      )}

      {lead && activeTab === "activity" && (
        <PageContent>
          <div className="max-w-3xl">
            <ActivityTimeline activities={activities ?? []} />
            <ActivityInputBar leadId={id} onAdded={() => mutateActivities()} />
          </div>
        </PageContent>
      )}

      <LeadConvertPanel
        convertOpen={convertOpen}
        setConvertOpen={setConvertOpen}
        convertData={convertData}
        setConvertData={setConvertData}
        existingCompanies={existingCompanies}
        handleConvert={handleConvert}
        converting={converting}
      />
    </div>
  );
}
