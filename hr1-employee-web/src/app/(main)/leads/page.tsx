"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
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
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants";
import { useCrmLeadsPage, useCrmCompanies } from "@/lib/hooks/use-crm";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { convertLead, deleteLead } from "@/lib/repositories/lead-repository";
import { fireTrigger } from "@/lib/automation/engine";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import type { BcLead } from "@/types/database";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Upload, Trash2 } from "lucide-react";
import { LeadEditPanel, LeadConvertPanel } from "./lead-edit-panel";
import { LeadImportDialog } from "./lead-import-dialog";
import { Pagination, usePagination } from "@/components/crm/pagination";
import { BulkActionBar, useBulkSelection } from "@/components/crm/bulk-action-bar";

const statusTabs = [
  { value: "all", label: "すべて" },
  { value: "new", label: "新規" },
  { value: "contacted", label: "連絡済" },
  { value: "qualified", label: "有望" },
  { value: "unqualified", label: "見込み薄" },
  { value: "converted", label: "変換済" },
];

export default function CrmLeadsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { organization } = useOrg();
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    leads,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  } = useCrmLeadsPage();

  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);
  const { data: existingCompanies } = useCrmCompanies();

  const [importOpen, setImportOpen] = useState(false);

  const { page, pageSize, totalCount, paginatedItems, onPageChange, onPageSizeChange } =
    usePagination(filtered);
  const bulk = useBulkSelection(paginatedItems);

  const handleBulkDelete = async (ids: string[]) => {
    if (!organization) return;
    for (const id of ids) {
      await deleteLead(getSupabase(), id, organization.id);
    }
    bulk.clear();
    mutate();
    showToast(`${ids.length}件のリードを削除しました`);
  };

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<BcLead | null>(null);
  const [convertData, setConvertData] = useState({
    existingCompanyId: "" as string,
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    dealTitle: "",
  });
  const [converting, setConverting] = useState(false);

  const findMatchingCompany = (companyName: string) =>
    (existingCompanies ?? []).find(
      (c) => c.name.trim().toLowerCase() === companyName.trim().toLowerCase()
    );

  const openConvert = (lead: BcLead) => {
    setConvertTarget(lead);
    const match = findMatchingCompany(lead.name);
    setConvertData({
      existingCompanyId: match?.id ?? "",
      companyName: lead.name,
      contactName: lead.contact_name ?? "",
      contactEmail: lead.contact_email ?? "",
      contactPhone: lead.contact_phone ?? "",
      dealTitle: `${lead.name} - 商談`,
    });
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!convertTarget || !organization) return;
    const needsCompanyName = !convertData.existingCompanyId && !convertData.companyName;
    if (needsCompanyName || !convertData.dealTitle) {
      showToast("企業名と商談名は必須です", "error");
      return;
    }
    setConverting(true);
    try {
      const firstStage = stages[0];
      const useExisting = !!convertData.existingCompanyId;
      await convertLead(getSupabase(), convertTarget.id, organization.id, {
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
        entityId: convertTarget.id,
        entityData: convertTarget as unknown as Record<string, unknown>,
      }).catch(() => {});
      setConvertOpen(false);
      mutate();
    } catch {
      showToast("変換に失敗しました", "error");
    } finally {
      setConverting(false);
    }
  };

  const tabCountsMap = useMemo(() => {
    const all = leads ?? [];
    return {
      all: all.length,
      new: all.filter((l) => l.status === "new").length,
      contacted: all.filter((l) => l.status === "contacted").length,
      qualified: all.filter((l) => l.status === "qualified").length,
      unqualified: all.filter((l) => l.status === "unqualified").length,
      converted: all.filter((l) => l.status === "converted").length,
    } as Record<string, number>;
  }, [leads]);

  const tabsWithCount = statusTabs.map((t) => ({
    ...t,
    label: `${t.label}（${tabCountsMap[t.value] ?? 0}）`,
  }));

  return (
    <div className="flex flex-col">
      <PageHeader
        title="リード管理"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button variant="primary" onClick={openCreate}>
              新規登録
            </Button>
          </div>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      <StickyFilterBar>
        <TabBar tabs={tabsWithCount} activeTab={statusFilter} onTabChange={setStatusFilter} />
      </StickyFilterBar>

      <SearchBar value={search} onChange={setSearch} placeholder="企業名・担当者名・メールで検索" />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={bulk.isAllSelected}
                  indeterminate={bulk.isIndeterminate}
                  onCheckedChange={() => bulk.toggleAll()}
                />
              </TableHead>
              <TableHead>企業名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-25">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={!leads}
              isEmpty={filtered.length === 0}
              emptyMessage="リードが見つかりません"
            >
              {paginatedItems.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={bulk.isSelected(lead.id)}
                      onCheckedChange={() => bulk.toggle(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.contact_name ?? "—"}</TableCell>
                  <TableCell>{leadSourceLabels[lead.source] ?? lead.source}</TableCell>
                  <TableCell>
                    <Badge variant={leadStatusColors[lead.status]}>
                      {leadStatusLabels[lead.status] ?? lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.status !== "converted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openConvert(lead);
                        }}
                      >
                        <ArrowRightLeft className="size-3.5 mr-1" />
                        変換
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </TableSection>

      <BulkActionBar
        selectedIds={bulk.selectedIds}
        totalCount={paginatedItems.length}
        onClearSelection={bulk.clear}
        actions={[
          {
            label: "一括削除",
            icon: <Trash2 className="size-4 mr-1" />,
            variant: "destructive",
            confirm: true,
            confirmMessage: `選択した${bulk.selectedIds.length}件のリードを削除しますか？`,
            onClick: handleBulkDelete,
          },
        ]}
      />

      <LeadEditPanel
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editData={editData}
        setEditData={setEditData}
        errors={errors}
        handleSave={handleSave}
        handleDelete={handleDelete}
        saving={saving}
        deleting={deleting}
        showToast={showToast}
      />

      <LeadConvertPanel
        convertOpen={convertOpen}
        setConvertOpen={setConvertOpen}
        convertData={convertData}
        setConvertData={setConvertData}
        existingCompanies={existingCompanies}
        handleConvert={handleConvert}
        converting={converting}
      />

      {organization && (
        <LeadImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          organizationId={organization.id}
          onComplete={() => mutate()}
        />
      )}
    </div>
  );
}
