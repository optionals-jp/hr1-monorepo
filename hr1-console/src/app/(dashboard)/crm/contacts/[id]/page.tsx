"use client";

import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useCrmContactDetailPage } from "@/features/crm/hooks/use-crm-contact-detail-page";
import { dealStatusLabels, activityTypeLabels } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { Edit, Trash2, Phone, Mail, Building2, User, Briefcase, CreditCard } from "lucide-react";

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

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

  if (h.contact === undefined)
    return <div className="flex items-center justify-center py-20 text-muted-foreground">読み込み中...</div>;

  if (h.contact === null) {
    return (
      <div className="flex flex-col">
        <PageHeader title="連絡先" sticky={false} border={false} breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }, { label: "連絡先", href: "/crm/contacts" }]} />
        <PageContent><p className="text-sm text-muted-foreground text-center py-12">連絡先が見つかりません</p></PageContent>
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
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }, { label: "連絡先", href: "/crm/contacts" }, { label: fullName, href: `/crm/contacts/${h.id}` }]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={h.openEdit}><Edit className="h-4 w-4 mr-1.5" />編集</Button>
            <Button variant="outline" size="sm" onClick={() => h.setConfirmOpen(true)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1.5" />削除</Button>
          </div>
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ContactProfile contact={contact} fullName={fullName} fullNameKana={fullNameKana} onCompanyClick={() => router.push(`/crm/companies/${contact.company_id}`)} />
          <div className="lg:col-span-2 space-y-6">
            <RelatedDeals deals={h.deals} onDealClick={(id) => router.push(`/crm/deals/${id}`)} />
            <ActivityHistory activities={h.activities} />
            <BusinessCards cards={h.cards} />
          </div>
        </div>
      </PageContent>

      <ContactEditForm h={h} onSave={onSave} />

      <ConfirmDialog open={h.confirmOpen} onOpenChange={h.setConfirmOpen} title="連絡先の削除" description={`「${fullName}」を削除しますか？この操作は元に戻せません。`} variant="destructive" confirmLabel="削除" onConfirm={onDelete} loading={h.deleting} />
    </div>
  );
}

/* ---------- Sub-components ---------- */

type HookReturn = ReturnType<typeof useCrmContactDetailPage>;

function ContactProfile({ contact, fullName, fullNameKana, onCompanyClick }: { contact: NonNullable<HookReturn["contact"]>; fullName: string; fullNameKana: string; onCompanyClick: () => void }) {
  return (
    <SectionCard className="self-start">
      <div className="flex flex-col mb-6">
        <Avatar className="size-20 mb-3"><AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-semibold">{contact.last_name[0]}{contact.first_name?.[0] ?? ""}</AvatarFallback></Avatar>
        <h2 className="text-lg font-semibold">{fullName}</h2>
        {fullNameKana && <p className="text-sm text-muted-foreground">{fullNameKana}</p>}
      </div>
      <div className="space-y-4 text-sm">
        {contact.crm_companies?.name && <InfoLine icon={Building2}><button className="text-primary hover:underline" onClick={onCompanyClick}>{contact.crm_companies.name}</button></InfoLine>}
        {contact.department && <InfoLine icon={Briefcase}>{contact.department}</InfoLine>}
        {contact.position && <InfoLine icon={User}>{contact.position}</InfoLine>}
        {contact.email && <InfoLine icon={Mail}><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></InfoLine>}
        {contact.phone && <InfoLine icon={Phone}>{contact.phone}</InfoLine>}
        {contact.mobile_phone && <InfoLine icon={Phone}>{contact.mobile_phone} <span className="text-xs text-muted-foreground">(携帯)</span></InfoLine>}
        {contact.notes && <div className="pt-2 border-t"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">メモ</p><p className="whitespace-pre-wrap text-muted-foreground">{contact.notes}</p></div>}
      </div>
    </SectionCard>
  );
}

function InfoLine({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground shrink-0" />{children}</div>;
}

function RelatedDeals({ deals, onDealClick }: { deals: HookReturn["deals"]; onDealClick: (id: string) => void }) {
  return (
    <SectionCard>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Briefcase className="h-4 w-4 text-muted-foreground" />関連商談{deals && deals.length > 0 && <Badge variant="outline" className="text-xs">{deals.length}</Badge>}</h3>
      {!deals ? <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p> : deals.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">関連する商談はありません</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>商談名</TableHead><TableHead className="text-right">金額</TableHead><TableHead>ステータス</TableHead><TableHead>予定日</TableHead></TableRow></TableHeader>
          <TableBody>
            {deals.map((d) => (
              <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onDealClick(d.id)}>
                <TableCell><span className="font-medium">{d.title}</span></TableCell>
                <TableCell className="text-right tabular-nums">{d.amount != null ? formatJpy(d.amount) : "---"}</TableCell>
                <TableCell><Badge variant={d.status === "won" ? "secondary" : d.status === "lost" ? "destructive" : "default"}>{dealStatusLabels[d.status] ?? d.status}</Badge></TableCell>
                <TableCell><span className="text-muted-foreground tabular-nums">{fmtDate(d.expected_close_date)}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

function ActivityHistory({ activities }: { activities: HookReturn["activities"] }) {
  return (
    <SectionCard>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Mail className="h-4 w-4 text-muted-foreground" />活動履歴{activities && activities.length > 0 && <Badge variant="outline" className="text-xs">{activities.length}</Badge>}</h3>
      {!activities ? <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p> : activities.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">活動履歴はありません</p> : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-xs">{activityTypeLabels[a.activity_type] ?? a.activity_type}</Badge><span className="text-xs text-muted-foreground tabular-nums">{fmtDate(a.activity_date ?? a.created_at)}</span></div>
                <p className="text-sm font-medium">{a.title}</p>
                {a.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function BusinessCards({ cards }: { cards: HookReturn["cards"] }) {
  return (
    <SectionCard>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><CreditCard className="h-4 w-4 text-muted-foreground" />名刺{cards && cards.length > 0 && <Badge variant="outline" className="text-xs">{cards.length}</Badge>}</h3>
      {!cards ? <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p> : cards.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">名刺はありません</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div key={c.id} className="rounded-lg border bg-background overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="aspect-[16/10] bg-muted relative"><img src={c.image_url} alt="名刺画像" className="absolute inset-0 w-full h-full object-contain" /></div>
              <div className="p-2 text-xs text-muted-foreground">スキャン日: {fmtDate(c.scanned_at)}</div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ContactEditForm({ h, onSave }: { h: HookReturn; onSave: () => void }) {
  const f = (id: string, label: string, field: keyof HookReturn["form"], opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{opts?.required && <span className="text-destructive"> *</span>}</Label>
      <Input id={id} type={opts?.type} value={h.form[field]} onChange={(e) => h.updateField(field, e.target.value)} placeholder={opts?.placeholder} />
    </div>
  );
  return (
    <EditPanel open={h.editOpen} onOpenChange={h.setEditOpen} title="連絡先を編集" onSave={onSave} saving={h.saving} saveLabel="保存">
      <div className="space-y-4">
        {f("ec-ln", "姓", "last_name", { required: true, placeholder: "例: 田中" })}
        {f("ec-fn", "名", "first_name", { placeholder: "例: 太郎" })}
        {f("ec-lnk", "姓カナ", "last_name_kana", { placeholder: "例: タナカ" })}
        {f("ec-fnk", "名カナ", "first_name_kana", { placeholder: "例: タロウ" })}
        <div className="space-y-1.5">
          <Label>企業</Label>
          <Select value={h.form.company_id} onValueChange={(v) => h.updateField("company_id", v ?? "")}>
            <SelectTrigger><SelectValue placeholder="企業を選択" /></SelectTrigger>
            <SelectContent>{(h.companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {f("ec-dep", "部署", "department", { placeholder: "例: 営業部" })}
        {f("ec-pos", "役職", "position", { placeholder: "例: 部長" })}
        {f("ec-em", "メール", "email", { type: "email", placeholder: "例: tanaka@example.com" })}
        {f("ec-ph", "電話番号", "phone", { placeholder: "例: 03-1234-5678" })}
        {f("ec-mp", "携帯", "mobile_phone", { placeholder: "例: 090-1234-5678" })}
        <div className="space-y-1.5"><Label>メモ</Label><Textarea value={h.form.notes} onChange={(e) => h.updateField("notes", e.target.value)} placeholder="メモや備考を入力" rows={3} /></div>
      </div>
    </EditPanel>
  );
}
