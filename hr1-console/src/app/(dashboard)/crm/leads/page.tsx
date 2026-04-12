"use client";

import { useState, useCallback, useMemo } from "react";
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
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { leadSourceLabels, leadStatusLabels, leadStatusColors } from "@/lib/constants/crm";
import { Plus } from "lucide-react";
import type { BcLead, BcLeadStatus } from "@/types/database";

type StatusFilter = "all" | BcLeadStatus;

interface LeadFormData {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  source: string;
  assigned_to: string;
  notes: string;
}

const emptyForm: LeadFormData = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "web",
  assigned_to: "",
  notes: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function CrmLeadsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: employees } = useEmployees();

  const { data: leads, mutate } = useOrgQuery("crm-leads", async (orgId) => {
    const { data, error } = await getSupabase()
      .from("crm_leads")
      .select("*, profiles:assigned_to(display_name, email)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BcLead[];
  });

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<LeadFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.contact_name ?? "").toLowerCase().includes(q) ||
          (l.contact_email ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, statusFilter, search]);

  // Resolve employee name
  const getEmployeeName = useCallback(
    (userId: string | null) => {
      if (!userId || !employees) return "---";
      const emp = employees.find((e) => e.id === userId);
      return emp?.display_name ?? emp?.email ?? "---";
    },
    [employees]
  );

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof LeadFormData>(field: K, value: LeadFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save lead
  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!form.name.trim()) {
      showToast("企業名は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("crm_leads")
        .insert({
          organization_id: organization.id,
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || null,
          contact_email: form.contact_email.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          source: form.source || "web",
          status: "new" as const,
          assigned_to: form.assigned_to || null,
          notes: form.notes.trim() || null,
          created_by: user?.id ?? null,
        });
      if (error) throw error;
      showToast("リードを作成しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("リードの作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, showToast, mutate]);

  const loading = !leads;

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
          onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
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
        onSave={handleSave}
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
