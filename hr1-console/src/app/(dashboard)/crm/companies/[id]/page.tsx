"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchCompany,
  updateCompany,
  deleteCompany,
  fetchContactsByCompany,
  fetchDealsByCompany,
  fetchActivitiesByCompany,
} from "@/lib/repositories/crm-repository";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { Edit, Trash2, Building2, Phone, Mail, Globe, MapPin, ArrowLeft, User } from "lucide-react";
import type { BcCompany } from "@/types/database";

interface CompanyFormData {
  name: string;
  name_kana: string;
  industry: string;
  phone: string;
  address: string;
  postal_code: string;
  website: string;
  corporate_number: string;
  notes: string;
}

function companyToForm(company: BcCompany): CompanyFormData {
  return {
    name: company.name,
    name_kana: company.name_kana ?? "",
    industry: company.industry ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    postal_code: company.postal_code ?? "",
    website: company.website ?? "",
    corporate_number: company.corporate_number ?? "",
    notes: company.notes ?? "",
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5 break-words">{children}</p>
      </div>
    </div>
  );
}

export default function CrmCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  useAuth();

  // Fetch company
  const {
    data: company,
    mutate: mutateCompany,
    isLoading: companyLoading,
  } = useOrgQuery(`crm-company-${id}`, (orgId) => fetchCompany(getSupabase(), id, orgId));

  // Fetch related contacts
  const { data: contacts } = useOrgQuery(`crm-company-contacts-${id}`, (orgId) =>
    fetchContactsByCompany(getSupabase(), id, orgId)
  );

  // Fetch related deals
  const { data: deals } = useOrgQuery(`crm-company-deals-${id}`, (orgId) =>
    fetchDealsByCompany(getSupabase(), id, orgId)
  );

  // Fetch related activities
  const { data: activities } = useOrgQuery(`crm-company-activities-${id}`, (orgId) =>
    fetchActivitiesByCompany(getSupabase(), id, orgId)
  );

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormData>({
    name: "",
    name_kana: "",
    industry: "",
    phone: "",
    address: "",
    postal_code: "",
    website: "",
    corporate_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open edit panel
  const openEdit = useCallback(() => {
    if (!company) return;
    setForm(companyToForm(company));
    setEditOpen(true);
  }, [company]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save company update
  const handleSave = useCallback(async () => {
    if (!organization || !company || saving) return;
    if (!form.name.trim()) {
      showToast("企業名は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      await updateCompany(getSupabase(), company.id, organization.id, {
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        industry: form.industry.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        website: form.website.trim() || null,
        corporate_number: form.corporate_number.trim() || null,
        notes: form.notes.trim() || null,
      });
      showToast("企業情報を更新しました");
      setEditOpen(false);
      mutateCompany();
    } catch {
      showToast("企業情報の更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, company, saving, form, showToast, mutateCompany]);

  // Delete company
  const handleDelete = useCallback(async () => {
    if (!organization || !company || deleting) return;

    setDeleting(true);
    try {
      await deleteCompany(getSupabase(), company.id, organization.id);
      showToast("企業を削除しました");
      router.push("/crm/companies");
    } catch {
      showToast("企業の削除に失敗しました", "error");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [organization, company, deleting, showToast, router]);

  // Loading state
  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  // Not found
  if (!company) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="企業が見つかりません"
          sticky={false}
          border={false}
          breadcrumb={[
            { label: "CRM", href: "/crm/dashboard" },
            { label: "取引先企業", href: "/crm/companies" },
          ]}
        />
        <PageContent>
          <p className="text-sm text-muted-foreground text-center py-12">
            指定された企業は存在しないか、アクセス権がありません。
          </p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => router.push("/crm/companies")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              一覧に戻る
            </Button>
          </div>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={company.name}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "取引先企業", href: "/crm/companies" },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEdit}>
              <Edit className="h-4 w-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Company Info */}
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              企業情報
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="企業名">
                {company.name}
              </InfoRow>
              <InfoRow label="フリガナ">{company.name_kana ?? "---"}</InfoRow>
              <InfoRow label="業種">{company.industry ?? "---"}</InfoRow>
              <InfoRow icon={<Phone className="h-4 w-4" />} label="電話番号">
                {company.phone ?? "---"}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="郵便番号">
                {company.postal_code ?? "---"}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="住所">
                {company.address ?? "---"}
              </InfoRow>
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Webサイト">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  "---"
                )}
              </InfoRow>
              <InfoRow label="法人番号">{company.corporate_number ?? "---"}</InfoRow>
            </div>
            {company.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">備考</p>
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </SectionCard>

          {/* Related Contacts */}
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              関連する連絡先
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>氏名</TableHead>
                  <TableHead>部署</TableHead>
                  <TableHead>役職</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>電話</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmptyState
                  colSpan={5}
                  isLoading={!contacts}
                  isEmpty={(contacts ?? []).length === 0}
                  emptyMessage="関連する連絡先がありません"
                >
                  {(contacts ?? []).map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">
                          {contact.last_name}
                          {contact.first_name ? ` ${contact.first_name}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{contact.department ?? "---"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{contact.position ?? "---"}</span>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            {contact.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {contact.phone ?? contact.mobile_phone ?? "---"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </SectionCard>

          {/* Related Deals */}
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              関連する商談
            </h2>
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
                <TableEmptyState
                  colSpan={4}
                  isLoading={!deals}
                  isEmpty={(deals ?? []).length === 0}
                  emptyMessage="関連する商談がありません"
                >
                  {(deals ?? []).map((deal) => (
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
                        <Badge variant={dealStatusColors[deal.status] ?? "default"}>
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
                </TableEmptyState>
              </TableBody>
            </Table>
          </SectionCard>

          {/* Related Activities */}
          <SectionCard>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              活動履歴
            </h2>
            {!activities ? (
              <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">活動履歴がありません</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {activityTypeLabels[activity.activity_type] ?? activity.activity_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(activity.activity_date)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                      {activity.profiles?.display_name && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.profiles.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </PageContent>

      {/* Edit Company Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="企業情報を編集"
        onSave={handleSave}
        saving={saving}
        saveLabel="保存"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-company-name">
              企業名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-company-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-name-kana">フリガナ</Label>
            <Input
              id="edit-company-name-kana"
              value={form.name_kana}
              onChange={(e) => updateField("name_kana", e.target.value)}
              placeholder="例: カブシキガイシャサンプル"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-industry">業種</Label>
            <Input
              id="edit-company-industry"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
              placeholder="例: IT・通信"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-phone">電話番号</Label>
            <Input
              id="edit-company-phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-postal-code">郵便番号</Label>
            <Input
              id="edit-company-postal-code"
              value={form.postal_code}
              onChange={(e) => updateField("postal_code", e.target.value)}
              placeholder="例: 100-0001"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-address">住所</Label>
            <Input
              id="edit-company-address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="例: 東京都千代田区丸の内1-1-1"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-website">Webサイト</Label>
            <Input
              id="edit-company-website"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="例: https://example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-corporate-number">法人番号</Label>
            <Input
              id="edit-company-corporate-number"
              value={form.corporate_number}
              onChange={(e) => updateField("corporate_number", e.target.value)}
              placeholder="例: 1234567890123"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-notes">備考</Label>
            <Textarea
              id="edit-company-notes"
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
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="企業の削除"
        description={`「${company.name}」を削除しますか？関連する連絡先や商談との紐付けも解除されます。この操作は元に戻せません。`}
        variant="destructive"
        confirmLabel="削除"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
