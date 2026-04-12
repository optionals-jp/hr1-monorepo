"use client";

import { useState } from "react";
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
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { fetchCompanies, fetchDealsAll } from "@/lib/repositories/crm-repository";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants/crm";
import { formatJpy } from "@/features/crm/rules";
import type { BcQuote, BcCompany, BcDeal } from "@/types/database";
import { Plus, FileText } from "lucide-react";

export default function QuotesPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: quotes, mutate } = useOrgQuery<BcQuote[]>("crm-quotes", async (orgId) => {
    const { data, error } = await getSupabase()
      .from("crm_quotes")
      .select("*, crm_companies(name), crm_deals(title)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BcQuote[];
  });

  const { data: companies } = useOrgQuery<BcCompany[]>("crm-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  const { data: deals } = useOrgQuery<BcDeal[]>("crm-deals-all", (orgId) =>
    fetchDealsAll(getSupabase(), orgId)
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [formTitle, setFormTitle] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formDealId, setFormDealId] = useState("");
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const filtered = (quotes ?? []).filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const companyName = (q.crm_companies as unknown as { name: string } | undefined)?.name ?? "";
      return (
        q.title.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s) ||
        companyName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const generateQuoteNumber = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const r = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `Q-${y}${m}${d}-${r}`;
  };

  const handleCreate = async () => {
    if (!organization || !formTitle.trim()) {
      showToast("タイトルを入力してください", "error");
      return;
    }
    try {
      const { error } = await getSupabase()
        .from("crm_quotes")
        .insert({
          organization_id: organization.id,
          quote_number: generateQuoteNumber(),
          title: formTitle,
          company_id: formCompanyId || null,
          deal_id: formDealId || null,
          issue_date: formIssueDate,
          expiry_date: formExpiryDate || null,
          notes: formNotes || null,
          status: "draft",
          created_by: user?.id ?? null,
        });
      if (error) throw error;
      setAddOpen(false);
      setFormTitle("");
      setFormCompanyId("");
      setFormDealId("");
      setFormNotes("");
      mutate();
      showToast("見積書を作成しました");
    } catch {
      showToast("見積書の作成に失敗しました", "error");
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
                const companyName = (q.crm_companies as unknown as { name: string } | undefined)
                  ?.name;
                const dealTitle = (q.crm_deals as unknown as { title: string } | undefined)?.title;
                return (
                  <TableRow key={q.id} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{q.quote_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell>{companyName ?? "—"}</TableCell>
                    <TableCell>{dealTitle ?? "—"}</TableCell>
                    <TableCell>{q.total > 0 ? formatJpy(q.total) : "—"}</TableCell>
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
        onSave={handleCreate}
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
