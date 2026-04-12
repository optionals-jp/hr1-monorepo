"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
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
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { formatDate } from "@/features/crm/rules";
import { useCrmLeadsPage } from "@/features/crm/hooks/use-crm-leads-page";
import { Plus } from "lucide-react";

export default function CrmLeadsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const {
    employees,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    form,
    saving,
    filteredLeads,
    getEmployeeName,
    openAdd,
    updateField,
    handleSave,
  } = useCrmLeadsPage();

  const onSave = async () => {
    const result = await handleSave();
    if (result.success) {
      showToast("リードを作成しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="リード管理"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "リード", href: "/crm/leads" },
        ]}
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            リードを追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="企業名・担当者名・メールで検索"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? "all") as typeof statusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="new">新規</SelectItem>
            <SelectItem value="contacted">連絡済</SelectItem>
            <SelectItem value="qualified">有望</SelectItem>
            <SelectItem value="unqualified">見込み薄</SelectItem>
            <SelectItem value="converted">コンバート済</SelectItem>
          </SelectContent>
        </Select>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>企業名</TableHead>
              <TableHead>担当者名</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>担当</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={loading}
              isEmpty={filteredLeads.length === 0}
              emptyMessage="リードがありません"
            >
              {filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/leads/${lead.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">{lead.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{lead.contact_name ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{leadSourceLabels[lead.source] ?? lead.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leadStatusColors[lead.status] ?? "default"}>
                      {leadStatusLabels[lead.status] ?? lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {lead.profiles?.display_name ?? getEmployeeName(lead.assigned_to)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDate(lead.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* Add Lead Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="リードを追加"
        onSave={onSave}
        saving={saving}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">
              企業名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-contact-name">担当者名</Label>
            <Input
              id="lead-contact-name"
              value={form.contact_name}
              onChange={(e) => updateField("contact_name", e.target.value)}
              placeholder="例: 山田 太郎"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-contact-email">メールアドレス</Label>
            <Input
              id="lead-contact-email"
              type="email"
              value={form.contact_email}
              onChange={(e) => updateField("contact_email", e.target.value)}
              placeholder="例: yamada@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-contact-phone">電話番号</Label>
            <Input
              id="lead-contact-phone"
              value={form.contact_phone}
              onChange={(e) => updateField("contact_phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-source">ソース</Label>
            <Select value={form.source} onValueChange={(v) => updateField("source", v ?? "web")}>
              <SelectTrigger id="lead-source">
                <SelectValue placeholder="ソースを選択" />
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

          <div className="space-y-1.5">
            <Label htmlFor="lead-assigned">担当者</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) => updateField("assigned_to", v ?? "")}
            >
              <SelectTrigger id="lead-assigned">
                <SelectValue placeholder="担当者を選択" />
              </SelectTrigger>
              <SelectContent>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.display_name ?? e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">備考</Label>
            <Textarea
              id="lead-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="メモや備考を入力"
              rows={3}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
