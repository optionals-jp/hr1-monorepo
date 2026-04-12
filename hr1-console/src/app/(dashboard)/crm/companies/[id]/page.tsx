"use client";

import { useRouter } from "next/navigation";
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
import { useCrmCompanyDetailPage } from "@/features/crm/hooks/use-crm-company-detail-page";
import { dealStatusLabels, dealStatusColors, activityTypeLabels } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { Edit, Trash2, Building2, Phone, Mail, Globe, MapPin, ArrowLeft, User } from "lucide-react";

function fmtDate(dateStr: string | null): string {
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

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function CrmCompanyDetailPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmCompanyDetailPage();

  const onSave = async () => {
    const r = await h.handleUpdate();
    if (r.success) showToast("企業情報を更新しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onDelete = async () => {
    const r = await h.handleDelete();
    if (r.success) {
      showToast("企業を削除しました");
      router.push("/crm/companies");
    } else if (r.error) showToast(r.error, "error");
  };

  if (h.companyLoading)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );

  if (!h.company) {
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

  const { company } = h;
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
            <Button variant="outline" onClick={h.openEdit}>
              <Edit className="h-4 w-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => h.setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="space-y-6">
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
                  isLoading={!h.contacts}
                  isEmpty={(h.contacts ?? []).length === 0}
                  emptyMessage="関連する連絡先がありません"
                >
                  {(h.contacts ?? []).map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/crm/contacts/${c.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">
                          {c.last_name}
                          {c.first_name ? ` ${c.first_name}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{c.department ?? "---"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{c.position ?? "---"}</span>
                      </TableCell>
                      <TableCell>
                        {c.email ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {c.phone ?? c.mobile_phone ?? "---"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </SectionCard>

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
                  isLoading={!h.deals}
                  isEmpty={(h.deals ?? []).length === 0}
                  emptyMessage="関連する商談がありません"
                >
                  {(h.deals ?? []).map((deal) => (
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
                          {fmtDate(deal.expected_close_date)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              活動履歴
            </h2>
            {!h.activities ? (
              <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
            ) : h.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">活動履歴がありません</p>
            ) : (
              <div className="space-y-3">
                {h.activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {activityTypeLabels[a.activity_type] ?? a.activity_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {fmtDate(a.activity_date)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      )}
                      {a.profiles?.display_name && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {a.profiles.display_name}
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

      <EditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="企業情報を編集"
        onSave={onSave}
        saving={h.saving}
        saveLabel="保存"
      >
        <div className="space-y-4">
          <Field id="edit-company-name" label="企業名" required>
            <Input
              id="edit-company-name"
              value={h.form.name}
              onChange={(e) => h.updateField("name", e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </Field>
          <Field id="edit-company-name-kana" label="フリガナ">
            <Input
              id="edit-company-name-kana"
              value={h.form.name_kana}
              onChange={(e) => h.updateField("name_kana", e.target.value)}
              placeholder="例: カブシキガイシャサンプル"
            />
          </Field>
          <Field id="edit-company-industry" label="業種">
            <Input
              id="edit-company-industry"
              value={h.form.industry}
              onChange={(e) => h.updateField("industry", e.target.value)}
              placeholder="例: IT・通信"
            />
          </Field>
          <Field id="edit-company-phone" label="電話番号">
            <Input
              id="edit-company-phone"
              value={h.form.phone}
              onChange={(e) => h.updateField("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </Field>
          <Field id="edit-company-postal-code" label="郵便番号">
            <Input
              id="edit-company-postal-code"
              value={h.form.postal_code}
              onChange={(e) => h.updateField("postal_code", e.target.value)}
              placeholder="例: 100-0001"
            />
          </Field>
          <Field id="edit-company-address" label="住所">
            <Input
              id="edit-company-address"
              value={h.form.address}
              onChange={(e) => h.updateField("address", e.target.value)}
              placeholder="例: 東京都千代田区丸の内1-1-1"
            />
          </Field>
          <Field id="edit-company-website" label="Webサイト">
            <Input
              id="edit-company-website"
              value={h.form.website}
              onChange={(e) => h.updateField("website", e.target.value)}
              placeholder="例: https://example.com"
            />
          </Field>
          <Field id="edit-company-corporate-number" label="法人番号">
            <Input
              id="edit-company-corporate-number"
              value={h.form.corporate_number}
              onChange={(e) => h.updateField("corporate_number", e.target.value)}
              placeholder="例: 1234567890123"
            />
          </Field>
          <Field id="edit-company-notes" label="備考">
            <Textarea
              id="edit-company-notes"
              value={h.form.notes}
              onChange={(e) => h.updateField("notes", e.target.value)}
              placeholder="メモや備考を入力"
              rows={3}
            />
          </Field>
        </div>
      </EditPanel>

      <ConfirmDialog
        open={h.deleteOpen}
        onOpenChange={h.setDeleteOpen}
        title="企業の削除"
        description={`「${company.name}」を削除しますか？関連する連絡先や商談との紐付けも解除されます。この操作は元に戻せません。`}
        variant="destructive"
        confirmLabel="削除"
        onConfirm={onDelete}
        loading={h.deleting}
      />
    </div>
  );
}
