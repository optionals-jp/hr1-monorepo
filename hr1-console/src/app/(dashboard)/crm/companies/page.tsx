"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
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
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchCompanies, createCompany } from "@/lib/repositories/crm-repository";
import { Plus } from "lucide-react";

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

const emptyForm: CompanyFormData = {
  name: "",
  name_kana: "",
  industry: "",
  phone: "",
  address: "",
  postal_code: "",
  website: "",
  corporate_number: "",
  notes: "",
};

export default function CrmCompaniesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: companies, mutate: mutateCompanies } = useOrgQuery("crm-companies-list", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_kana ?? "").toLowerCase().includes(q) ||
        (c.industry ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save company
  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!form.name.trim()) {
      showToast("企業名は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      await createCompany(getSupabase(), {
        organization_id: organization.id,
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        industry: form.industry.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        website: form.website.trim() || null,
        corporate_number: form.corporate_number.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      showToast("企業を作成しました");
      setEditOpen(false);
      mutateCompanies();
    } catch {
      showToast("企業の作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, showToast, mutateCompanies]);

  const loading = !companies;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="取引先企業"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "取引先企業", href: "/crm/companies" },
        ]}
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            企業を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="企業名・フリガナ・業種・住所で検索"
        />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>企業名</TableHead>
              <TableHead>業種</TableHead>
              <TableHead>電話番号</TableHead>
              <TableHead>住所</TableHead>
              <TableHead>Webサイト</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={loading}
              isEmpty={filteredCompanies.length === 0}
              emptyMessage="企業がありません"
            >
              {filteredCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/companies/${company.id}`)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{company.name}</span>
                      {company.name_kana && (
                        <span className="block text-xs text-muted-foreground">
                          {company.name_kana}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.industry ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.phone ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.address ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    {company.website ? (
                      <span
                        className="text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(company.website!, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {company.website}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">---</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* Add Company Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="企業を追加"
        onSave={handleSave}
        saving={saving}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name">
              企業名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例: 株式会社サンプル"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-name-kana">フリガナ</Label>
            <Input
              id="company-name-kana"
              value={form.name_kana}
              onChange={(e) => updateField("name_kana", e.target.value)}
              placeholder="例: カブシキガイシャサンプル"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-industry">業種</Label>
            <Input
              id="company-industry"
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
              placeholder="例: IT・通信"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-phone">電話番号</Label>
            <Input
              id="company-phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-postal-code">郵便番号</Label>
            <Input
              id="company-postal-code"
              value={form.postal_code}
              onChange={(e) => updateField("postal_code", e.target.value)}
              placeholder="例: 100-0001"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-address">住所</Label>
            <Input
              id="company-address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="例: 東京都千代田区丸の内1-1-1"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-website">Webサイト</Label>
            <Input
              id="company-website"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="例: https://example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-corporate-number">法人番号</Label>
            <Input
              id="company-corporate-number"
              value={form.corporate_number}
              onChange={(e) => updateField("corporate_number", e.target.value)}
              placeholder="例: 1234567890123"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-notes">備考</Label>
            <Textarea
              id="company-notes"
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
