"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { useCrmLeadsPage } from "@/lib/hooks/use-crm";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { convertLead } from "@/lib/repositories/lead-repository";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import type { BcLead } from "@/types/database";
import { ArrowRightLeft } from "lucide-react";

export default function CrmLeadsPage() {
  const { showToast } = useToast();
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

  // コンバージョンダイアログ
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<BcLead | null>(null);
  const [convertData, setConvertData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    dealTitle: "",
  });
  const [converting, setConverting] = useState(false);

  const openConvert = (lead: BcLead) => {
    setConvertTarget(lead);
    setConvertData({
      companyName: lead.company_name ?? "",
      contactName: lead.name,
      contactEmail: lead.email ?? "",
      contactPhone: lead.phone ?? "",
      dealTitle: `${lead.company_name ?? lead.name} - 商談`,
    });
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!convertTarget || !organization) return;
    if (!convertData.companyName || !convertData.contactName || !convertData.dealTitle) {
      showToast("企業名・連絡先名・商談名は必須です", "error");
      return;
    }
    setConverting(true);
    try {
      const firstStage = stages[0];
      await convertLead(getSupabase(), convertTarget.id, organization.id, {
        companyName: convertData.companyName,
        contactName: convertData.contactName,
        contactEmail: convertData.contactEmail || null,
        contactPhone: convertData.contactPhone || null,
        dealTitle: convertData.dealTitle,
        dealStage: firstStage?.name ?? "initial",
        dealStageId: firstStage?.id,
        dealPipelineId: firstStage?.pipeline_id,
      });
      showToast("リードをコンバートしました（企業・連絡先・商談を作成）");
      setConvertOpen(false);
      mutate();
    } catch {
      showToast("コンバートに失敗しました", "error");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div>
      <PageHeader title="リード管理" action={<Button onClick={openCreate}>新規登録</Button>} />
      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="名前・企業名・メールで検索" />
        <div className="flex gap-1">
          {[
            { value: "all", label: "すべて" },
            { value: "new", label: "新規" },
            { value: "contacted", label: "連絡済" },
            { value: "qualified", label: "有望" },
            { value: "unqualified", label: "見込み薄" },
            { value: "converted", label: "コンバート済" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                statusFilter === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>企業名</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ソース</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="w-[100px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableEmptyState
          colSpan={6}
          isLoading={!leads}
          isEmpty={filtered.length === 0}
          emptyMessage="リードが見つかりません"
        >
          {filtered.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell
                className="font-medium cursor-pointer"
                onClick={() => {
                  setEditData({ ...lead });
                  setEditOpen(true);
                }}
              >
                {lead.name}
              </TableCell>
              <TableCell>{lead.company_name ?? "—"}</TableCell>
              <TableCell>{lead.email ?? "—"}</TableCell>
              <TableCell>{leadSourceLabels[lead.source] ?? lead.source}</TableCell>
              <TableCell>
                <Badge variant={leadStatusColors[lead.status]}>
                  {leadStatusLabels[lead.status] ?? lead.status}
                </Badge>
              </TableCell>
              <TableCell>
                {lead.status !== "converted" && (
                  <Button variant="outline" size="sm" onClick={() => openConvert(lead)}>
                    <ArrowRightLeft className="size-3.5 mr-1" />
                    変換
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableEmptyState>
      </Table>

      {/* リード編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "リード編集" : "リード登録"}
        onSave={() => handleSave(showToast)}
        saving={saving}
        onDelete={editData.id ? () => handleDelete(showToast) : undefined}
        deleting={deleting}
        confirmDeleteMessage="このリードを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-4">
          <div>
            <Label>名前 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              className={errors?.name ? "border-destructive" : ""}
            />
            {errors?.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label>企業名</Label>
            <Input
              value={editData.company_name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, company_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>メール</Label>
              <Input
                type="email"
                value={editData.email ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <Label>電話</Label>
              <Input
                value={editData.phone ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ソース</Label>
              <Select
                value={editData.source ?? "other"}
                onValueChange={(v) => setEditData((p) => ({ ...p, source: v as BcLead["source"] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leadSourceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ステータス</Label>
              <Select
                value={editData.status ?? "new"}
                onValueChange={(v) => setEditData((p) => ({ ...p, status: v as BcLead["status"] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leadStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>メモ</Label>
            <Textarea
              value={editData.notes ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>

      {/* コンバージョンパネル */}
      <EditPanel
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="リードをコンバート"
        onSave={handleConvert}
        saveLabel={converting ? "変換中..." : "企業・連絡先・商談を作成"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            このリードから企業・連絡先・商談を一括作成します。
          </p>

          <div>
            <Label>企業名 *</Label>
            <Input
              value={convertData.companyName}
              onChange={(e) => setConvertData((p) => ({ ...p, companyName: e.target.value }))}
            />
          </div>

          <div>
            <Label>連絡先名 *</Label>
            <Input
              value={convertData.contactName}
              onChange={(e) => setConvertData((p) => ({ ...p, contactName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>メール</Label>
              <Input
                type="email"
                value={convertData.contactEmail}
                onChange={(e) => setConvertData((p) => ({ ...p, contactEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label>電話</Label>
              <Input
                value={convertData.contactPhone}
                onChange={(e) => setConvertData((p) => ({ ...p, contactPhone: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>商談名 *</Label>
            <Input
              value={convertData.dealTitle}
              onChange={(e) => setConvertData((p) => ({ ...p, dealTitle: e.target.value }))}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
