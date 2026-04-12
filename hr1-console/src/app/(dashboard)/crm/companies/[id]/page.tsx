"use client";

import { useRouter } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
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
import { useCrmCompanyDetailPage } from "@/features/crm/hooks/use-crm-company-detail-page";
import { CompanyEditFields } from "@/features/crm/components/company-edit-fields";
import { InfoRow } from "@/features/crm/components/detail-helpers";
import { DealTable } from "@/features/crm/components/deal-table";
import { ActivityList } from "@/features/crm/components/activity-list";
import { Edit, Trash2, Building2, Phone, Mail, Globe, MapPin, ArrowLeft, User } from "lucide-react";

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

  if (h.companyLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

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
                      <TableCell className="font-medium">
                        {c.last_name}
                        {c.first_name ? ` ${c.first_name}` : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.department ?? "---"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.position ?? "---"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.email}
                          </span>
                        ) : (
                          "---"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.phone ?? c.mobile_phone ?? "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableEmptyState>
              </TableBody>
            </Table>
          </SectionCard>

          <DealTable deals={h.deals} onDealClick={(id) => router.push(`/crm/deals/${id}`)} />
          <ActivityList activities={h.activities} showAssignee />
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
        <CompanyEditFields form={h.form} updateField={h.updateField} />
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
