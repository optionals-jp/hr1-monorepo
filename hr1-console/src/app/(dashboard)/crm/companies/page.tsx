"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import type { BcCompany } from "@/types/database";
import { useCrmCompanies, saveCompany, removeCompany } from "@/lib/hooks/use-crm";

export default function CrmCompaniesPage() {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcCompany>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);

  const { data: companies, error, mutate } = useCrmCompanies();

  const filtered = (companies ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.name_kana?.toLowerCase().includes(q) ||
      c.corporate_number?.includes(q)
    );
  });

  const openCreate = () => {
    setEditData({});
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    const rules = { name: [validators.required("企業名")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    const result = await saveCompany({
      organizationId: organization!.id,
      data: editData,
    });
    if (result.success) {
      showToast(editData.id ? "企業情報を更新しました" : "企業を登録しました");
      setEditOpen(false);
      mutate();
    } else {
      showToast(result.error!, "error");
    }
  };

  const handleDelete = async () => {
    if (!editData.id) return;
    const result = await removeCompany(editData.id, organization!.id);
    if (result.success) {
      showToast("企業を削除しました");
      setEditOpen(false);
      mutate();
    } else {
      showToast(result.error!, "error");
    }
  };

  return (
    <div>
      <PageHeader title="取引先企業" action={<Button onClick={openCreate}>新規登録</Button>} />

      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="企業名・法人番号で検索" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>企業名</TableHead>
            <TableHead>法人番号</TableHead>
            <TableHead>業種</TableHead>
            <TableHead>電話番号</TableHead>
          </TableRow>
        </TableHeader>
        <TableEmptyState
          colSpan={4}
          isLoading={!companies}
          isEmpty={filtered.length === 0}
          emptyMessage="企業が見つかりません"
        >
          {filtered.map((company) => (
            <TableRow
              key={company.id}
              className="cursor-pointer"
              onClick={() => router.push(`/crm/companies/${company.id}`)}
            >
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.corporate_number ?? "—"}</TableCell>
              <TableCell>{company.industry ?? "—"}</TableCell>
              <TableCell>{company.phone ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableEmptyState>
      </Table>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "企業編集" : "企業登録"}
        onSave={handleSave}
        onDelete={editData.id ? handleDelete : undefined}
      >
        <div className="space-y-4">
          <div>
            <Label>企業名 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              className={errors?.name ? "border-destructive" : ""}
            />
            {errors?.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label>企業名（カナ）</Label>
            <Input
              value={editData.name_kana ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name_kana: e.target.value }))}
            />
          </div>
          <div>
            <Label>法人番号</Label>
            <Input
              value={editData.corporate_number ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, corporate_number: e.target.value }))}
            />
          </div>
          <div>
            <Label>電話番号</Label>
            <Input
              value={editData.phone ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>住所</Label>
            <Input
              value={editData.address ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div>
            <Label>Webサイト</Label>
            <Input
              value={editData.website ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, website: e.target.value }))}
            />
          </div>
          <div>
            <Label>業種</Label>
            <Input
              value={editData.industry ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, industry: e.target.value }))}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
