"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { EditPanel } from "@/components/ui/edit-panel";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { TableSection } from "@/components/layout/table-section";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useCrmCompaniesPage } from "@/lib/hooks/use-crm";

export default function CrmCompaniesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const {
    search,
    setSearch,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    companies,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
  } = useCrmCompaniesPage();

  return (
    <div>
      <PageHeader title="取引先企業" action={<Button onClick={openCreate}>新規登録</Button>} />

      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="企業名・法人番号で検索" />
      </div>

      <TableSection>
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
      </TableSection>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "企業編集" : "企業登録"}
        onSave={async () => {
          const result = await handleSave();
          if (result.success && result.message) showToast(result.message);
          else if (result.error) showToast(result.error, "error");
        }}
        onDelete={
          editData.id
            ? async () => {
                const result = await handleDelete();
                if (result.success) showToast("企業を削除しました");
                else if (result.error) showToast(result.error, "error");
              }
            : undefined
        }
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
