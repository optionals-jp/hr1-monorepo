"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { leadStatusLabels } from "@/lib/constants/crm";
import { useCrmLeadDetailPage } from "@/features/crm/hooks/use-crm-lead-detail-page";
import { LeadInfoCard } from "@/features/crm/components/lead-info-card";
import { LeadStatusFlow } from "@/features/crm/components/lead-status-flow";
import { LeadConvertedCard } from "@/features/crm/components/lead-converted-card";
import { LeadActivityList } from "@/features/crm/components/lead-activity-list";
import {
  LeadEditPanel,
  ActivityEditPanel,
  ConvertDialog,
} from "@/features/crm/components/lead-edit-panels";
import { Edit, Trash2, RefreshCw } from "lucide-react";

export default function LeadDetailPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmLeadDetailPage();

  const onUpdate = async () => {
    const r = await h.handleUpdate();
    if (r.success) showToast("リードを更新しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onStatusChange = async (s: string) => {
    const r = await h.handleStatusChange(s);
    if (r.success) showToast(`ステータスを「${leadStatusLabels[r.statusLabel!]}」に変更しました`);
    else if (r.error) showToast(r.error, "error");
  };
  const onDelete = async () => {
    const r = await h.handleDelete();
    if (r.success) {
      showToast("リードを削除しました");
      router.push("/crm/leads");
    } else if (r.error) showToast(r.error, "error");
  };
  const onAddActivity = async () => {
    const r = await h.handleAddActivity();
    if (r.success) showToast("活動を記録しました");
    else if (r.error) showToast(r.error, "error");
  };
  const onConvert = async () => {
    const r = await h.handleConvert();
    if (r.success) {
      showToast("リードをコンバートしました");
      router.push(`/crm/companies/${r.companyId}`);
    } else if (r.error) showToast(r.error, "error");
  };

  if (!h.lead)
    return (
      <div className="flex flex-col">
        <PageHeader title="読み込み中..." sticky={false} border={false} />
      </div>
    );

  const { lead, id } = h;
  const isConverted = lead.status === "converted";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={lead.name}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "リード", href: "/crm/leads" },
          { label: lead.name, href: `/crm/leads/${id}` },
        ]}
        action={
          <div className="flex items-center gap-2">
            {!isConverted && (
              <Button onClick={h.openConvert}>
                <RefreshCw className="size-4 mr-1.5" />
                コンバート
              </Button>
            )}
            <Button variant="outline" onClick={h.openEdit}>
              <Edit className="size-4 mr-1.5" />
              編集
            </Button>
            <Button variant="outline" onClick={() => h.setDeleteOpen(true)}>
              <Trash2 className="size-4 mr-1.5" />
              削除
            </Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 md:px-8 pb-6 space-y-6">
        <LeadInfoCard lead={lead} />
        {!isConverted && <LeadStatusFlow lead={lead} onStatusChange={onStatusChange} />}
        {isConverted && (
          <LeadConvertedCard
            lead={lead}
            onCompanyClick={() => router.push(`/crm/companies/${lead.converted_company_id}`)}
            onDealClick={() => router.push(`/crm/deals/${lead.converted_deal_id}`)}
          />
        )}
        <LeadActivityList activities={h.activities} onAddClick={() => h.setActOpen(true)} />
      </div>

      <LeadEditPanel h={h} onUpdate={onUpdate} />
      <ActivityEditPanel h={h} onAddActivity={onAddActivity} />
      <ConvertDialog h={h} onConvert={onConvert} />

      <ConfirmDialog
        open={h.deleteOpen}
        onOpenChange={h.setDeleteOpen}
        title="リードを削除"
        description={`「${lead.name}」を削除しますか？この操作は元に戻せません。`}
        onConfirm={onDelete}
        confirmLabel="削除"
        variant="destructive"
      />
    </div>
  );
}
