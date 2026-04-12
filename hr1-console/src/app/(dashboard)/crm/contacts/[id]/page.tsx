"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useOrg } from "@/lib/org-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchContact,
  fetchCompanies,
  fetchActivitiesByContact,
  fetchDealsByContact,
  fetchCardsByContact,
  updateContact,
  deleteContact,
} from "@/lib/repositories/crm-repository";
import { dealStatusLabels } from "@/lib/constants/crm";
import { activityTypeLabels } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { Edit, Trash2, Phone, Mail, Building2, User, Briefcase, CreditCard } from "lucide-react";
import type { BcContact } from "@/types/database";

interface ContactFormData {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  company_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  mobile_phone: string;
  notes: string;
}

function toForm(contact: BcContact): ContactFormData {
  return {
    last_name: contact.last_name,
    first_name: contact.first_name ?? "",
    last_name_kana: contact.last_name_kana ?? "",
    first_name_kana: contact.first_name_kana ?? "",
    company_id: contact.company_id ?? "",
    department: contact.department ?? "",
    position: contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mobile_phone: contact.mobile_phone ?? "",
    notes: contact.notes ?? "",
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function CrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();

  // Fetch contact
  const { data: contact, mutate: mutateContact } = useOrgQuery(`crm-contact-${id}`, (orgId) =>
    fetchContact(getSupabase(), id, orgId)
  );

  // Fetch companies for edit dropdown
  const { data: companies } = useOrgQuery("crm-contact-detail-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // Fetch related deals
  const { data: deals } = useOrgQuery(`crm-contact-${id}-deals`, (orgId) =>
    fetchDealsByContact(getSupabase(), id, orgId)
  );

  // Fetch activities
  const { data: activities } = useOrgQuery(`crm-contact-${id}-activities`, (orgId) =>
    fetchActivitiesByContact(getSupabase(), id, orgId)
  );

  // Fetch business cards
  const { data: cards } = useOrgQuery(`crm-contact-${id}-cards`, (orgId) =>
    fetchCardsByContact(getSupabase(), id, orgId)
  );

  // UI state
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    company_id: "",
    department: "",
    position: "",
    email: "",
    phone: "",
    mobile_phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open edit panel
  const openEdit = useCallback(() => {
    if (!contact) return;
    setForm(toForm(contact));
    setEditOpen(true);
  }, [contact]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save contact
  const handleSave = useCallback(async () => {
    if (!organization || !contact || saving) return;
    if (!form.last_name.trim()) {
      showToast("姓は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      await updateContact(getSupabase(), id, organization.id, {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim() || null,
        last_name_kana: form.last_name_kana.trim() || null,
        first_name_kana: form.first_name_kana.trim() || null,
        company_id: form.company_id || null,
        department: form.department.trim() || null,
        position: form.position.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile_phone: form.mobile_phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      showToast("連絡先を更新しました");
      setEditOpen(false);
      mutateContact();
    } catch {
      showToast("連絡先の更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, contact, saving, form, id, showToast, mutateContact]);

  // Delete contact
  const handleDelete = useCallback(async () => {
    if (!organization || deleting) return;
    setDeleting(true);
    try {
      await deleteContact(getSupabase(), id, organization.id);
      showToast("連絡先を削除しました");
      router.push("/crm/contacts");
    } catch {
      showToast("連絡先の削除に失敗しました", "error");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }, [organization, deleting, id, showToast, router]);

  // Loading state
  if (contact === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  // Not found
  if (contact === null) {
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
          { label: fullName, href: `/crm/contacts/${id}` },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Edit className="h-4 w-4 mr-1.5" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
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
          {/* Left column: Contact info */}
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

          {/* Right column: Related data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Related Deals */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  関連商談
                  {deals && deals.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {deals.length}
                    </Badge>
                  )}
                </h3>
              </div>

              {!deals ? (
                <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
              ) : deals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  関連する商談はありません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商談名</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>予定日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal) => (
                      <TableRow
                        key={deal.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/crm/deals/${deal.id}`)}
                      >
                        <TableCell>
                          <span className="font-medium">{deal.title}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {deal.amount != null ? formatJpy(deal.amount) : "---"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              deal.status === "won"
                                ? "secondary"
                                : deal.status === "lost"
                                  ? "destructive"
                                  : "default"
                            }
                          >
                            {dealStatusLabels[deal.status] ?? deal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground tabular-nums">
                            {formatDate(deal.expected_close_date)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>

            {/* Activities */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  活動履歴
                  {activities && activities.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {activities.length}
                    </Badge>
                  )}
                </h3>
              </div>

              {!activities ? (
                <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  活動履歴はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg border bg-background p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {activityTypeLabels[activity.activity_type] ?? activity.activity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDate(activity.activity_date ?? activity.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Business Cards */}
            <SectionCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  名刺
                  {cards && cards.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {cards.length}
                    </Badge>
                  )}
                </h3>
              </div>

              {!cards ? (
                <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
              ) : cards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">名刺はありません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cards.map((card) => (
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
                        スキャン日: {formatDate(card.scanned_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </PageContent>

      {/* Edit Contact Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="連絡先を編集"
        onSave={handleSave}
        saving={saving}
        saveLabel="保存"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-last-name">
              姓 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-contact-last-name"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              placeholder="例: 田中"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-first-name">名</Label>
            <Input
              id="edit-contact-first-name"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              placeholder="例: 太郎"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-last-name-kana">姓カナ</Label>
            <Input
              id="edit-contact-last-name-kana"
              value={form.last_name_kana}
              onChange={(e) => updateField("last_name_kana", e.target.value)}
              placeholder="例: タナカ"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-first-name-kana">名カナ</Label>
            <Input
              id="edit-contact-first-name-kana"
              value={form.first_name_kana}
              onChange={(e) => updateField("first_name_kana", e.target.value)}
              placeholder="例: タロウ"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-company">企業</Label>
            <Select
              value={form.company_id}
              onValueChange={(v) => updateField("company_id", v ?? "")}
            >
              <SelectTrigger id="edit-contact-company">
                <SelectValue placeholder="企業を選択" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-department">部署</Label>
            <Input
              id="edit-contact-department"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder="例: 営業部"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-position">役職</Label>
            <Input
              id="edit-contact-position"
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
              placeholder="例: 部長"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-email">メール</Label>
            <Input
              id="edit-contact-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="例: tanaka@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-phone">電話番号</Label>
            <Input
              id="edit-contact-phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-mobile-phone">携帯</Label>
            <Input
              id="edit-contact-mobile-phone"
              value={form.mobile_phone}
              onChange={(e) => updateField("mobile_phone", e.target.value)}
              placeholder="例: 090-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-contact-notes">メモ</Label>
            <Textarea
              id="edit-contact-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="メモや備考を入力"
              rows={3}
            />
          </div>
        </div>
      </EditPanel>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="連絡先の削除"
        description={`「${fullName}」を削除しますか？この操作は元に戻せません。`}
        variant="destructive"
        confirmLabel="削除"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
