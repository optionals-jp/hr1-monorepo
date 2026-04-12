"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
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
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import { useCrmQuotesPage } from "@/features/crm/hooks/use-crm-quotes-page";
import { Plus, FileText } from "lucide-react";

export default function QuotesPage() {
  const { showToast } = useToast();

  const {
    quotes,
    companies,
    deals,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    addOpen,
    setAddOpen,
    formTitle,
    setFormTitle,
    formCompanyId,
    setFormCompanyId,
    formDealId,
    setFormDealId,
    formIssueDate,
    setFormIssueDate,
    formExpiryDate,
    setFormExpiryDate,
    formNotes,
    setFormNotes,
    filtered,
    handleCreate,
  } = useCrmQuotesPage();

  const onCreate = async () => {
    const result = await handleCreate();
    if (result.success) {
      showToast("見積書を作成しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="見積書"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM", href: "/crm/dashboard" }]}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            見積書を作成
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar value={search} onChange={setSearch} />
        <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 h-12 bg-white">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Object.entries(quoteStatusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>見積番号</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>企業</TableHead>
              <TableHead>商談</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>発行日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={7}
              isLoading={!quotes}
              isEmpty={filtered.length === 0}
              emptyMessage="見積書がありません"
            >
              {filtered.map((q) => {
                const companyName = (q.crm_companies as { name: string } | undefined)?.name;
                const dealTitle = (q.crm_deals as { title: string } | undefined)?.title;
                return (
                  <TableRow key={q.id} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{q.quote_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell>{companyName ?? "\u2014"}</TableCell>
                    <TableCell>{dealTitle ?? "\u2014"}</TableCell>
                    <TableCell>{q.total > 0 ? formatJpy(q.total) : "\u2014"}</TableCell>
                    <TableCell>
                      <Badge variant={quoteStatusColors[q.status] ?? "default"}>
                        {quoteStatusLabels[q.status] ?? q.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{q.issue_date}</TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={addOpen}
        onOpenChange={setAddOpen}
        title="見積書を作成"
        onSave={onCreate}
        saveLabel="作成"
        saveDisabled={!formTitle.trim()}
      >
        <div className="space-y-4">
          <div>
            <Label>タイトル *</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="例: システム導入見積"
            />
          </div>
          <div>
            <Label>企業</Label>
            <Select value={formCompanyId} onValueChange={(v) => setFormCompanyId(v ?? "")}>
              <SelectTrigger>
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
          <div>
            <Label>商談</Label>
            <Select value={formDealId} onValueChange={(v) => setFormDealId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="商談を選択" />
              </SelectTrigger>
              <SelectContent>
                {(deals ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>発行日</Label>
            <Input
              type="date"
              value={formIssueDate}
              onChange={(e) => setFormIssueDate(e.target.value)}
            />
          </div>
          <div>
            <Label>有効期限</Label>
            <Input
              type="date"
              value={formExpiryDate}
              onChange={(e) => setFormExpiryDate(e.target.value)}
            />
          </div>
          <div>
            <Label>備考</Label>
            <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
