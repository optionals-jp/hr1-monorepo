"use client";

import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useCrmContactDetailPage } from "@/features/crm/hooks/use-crm-contact-detail-page";
import { ContactEditFields } from "@/features/crm/components/contact-edit-fields";
import { DealTable } from "@/features/crm/components/deal-table";
import { ActivityList } from "@/features/crm/components/activity-list";
import { fmtDate } from "@/features/crm/components/detail-helpers";
import { Edit, Trash2, Phone, Mail, Building2, User, Briefcase, CreditCard } from "lucide-react";

export default function CrmContactDetailPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmContactDetailPage();

  const onSave = async () => {
    const r = await h.handleUpdate();
    if (r.success) showToast("連絡先を更新しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onDelete = async () => {
    const r = await h.handleDelete();
    if (r.success) {
      showToast("連絡先を削除しました");
      router.push("/crm/contacts");
    } else if (r.error) showToast(r.error, "error");
  };

  if (h.contact === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (h.contact === null) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="連絡先"
          sticky={false}
          border={false}
          breadcrumb={[
            { label: "CRM", href: "/crm/dashboard" },
            { label: "連絡先", href: "/crm/contacts" },
          ]}
        />
        <PageContent>
          <p className="text-sm text-muted-foreground text-center py-12">連絡先が見つかりません</p>
        </PageContent>
      </div>
    );
  }

  const contact = h.contact;
  const fullName = `${contact.last_name} ${contact.first_name ?? ""}`.trim();
  const fullNameKana = [contact.last_name_kana, contact.first_name_kana].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col">
      <PageHeader
        title={fullName}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "連絡先", href: "/crm/contacts" },
          { label: fullName, href: `/crm/contacts/${h.id}` },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={h.openEdit}>
              <Edit className="h-4 w-4 mr-1.5" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => h.setConfirmOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SectionCard className="self-start">
            <div className="flex flex-col mb-6">
              <Avatar className="size-20 mb-3">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-semibold">
                  {contact.last_name[0]}
                  {contact.first_name?.[0] ?? ""}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-semibold">{fullName}</h2>
              {fullNameKana && <p className="text-sm text-muted-foreground">{fullNameKana}</p>}
            </div>
            <div className="space-y-4 text-sm">
              {contact.crm_companies?.name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`/crm/companies/${contact.company_id}`}
                    className="text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/crm/companies/${contact.company_id}`);
                    }}
                  >
                    {contact.crm_companies.name}
                  </a>
                </div>
              )}
              {contact.department && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contact.department}</span>
                </div>
              )}
              {contact.position && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contact.position}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.mobile_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{contact.mobile_phone}</span>
                  <span className="text-xs text-muted-foreground">(携帯)</span>
                </div>
              )}
              {contact.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    メモ
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{contact.notes}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="lg:col-span-2 space-y-6">
            <DealTable
              deals={h.deals}
              onDealClick={(id) => router.push(`/crm/deals/${id}`)}
              title="関連商談"
              icon="briefcase"
            />
            <ActivityList activities={h.activities} />

            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  名刺
                  {h.cards && h.cards.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {h.cards.length}
                    </Badge>
                  )}
                </h3>
              </div>
              {!h.cards ? (
                <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
              ) : h.cards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">名刺はありません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {h.cards.map((card) => (
                    <div key={card.id} className="rounded-lg border bg-background overflow-hidden">
                      <div className="aspect-[16/10] bg-muted relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.image_url}
                          alt="名刺画像"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-2 text-xs text-muted-foreground">
                        スキャン日: {fmtDate(card.scanned_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </PageContent>

      <EditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="連絡先を編集"
        onSave={onSave}
        saving={h.saving}
        saveLabel="保存"
      >
        <ContactEditFields
          form={h.form}
          updateField={h.updateField}
          companies={h.companies ?? []}
        />
      </EditPanel>

      <ConfirmDialog
        open={h.confirmOpen}
        onOpenChange={h.setConfirmOpen}
        title="連絡先の削除"
        description={`「${fullName}」を削除しますか？この操作は元に戻せません。`}
        variant="destructive"
        confirmLabel="削除"
        onConfirm={onDelete}
        loading={h.deleting}
      />
    </div>
  );
}
