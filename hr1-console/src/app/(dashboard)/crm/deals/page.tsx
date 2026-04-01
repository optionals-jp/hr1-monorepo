"use client";

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
import {
  dealStatusLabels,
  dealStatusColors,
  dealStageLabels,
  dealStageProbability,
} from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useCrmDealsPage, useCrmCompanies, useCrmContacts } from "@/lib/hooks/use-crm";

export default function CrmDealsPage() {
  const { showToast } = useToast();
  const router = useRouter();
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
    deals,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
  } = useCrmDealsPage();

  const { data: companies } = useCrmCompanies();
  const { data: contacts } = useCrmContacts();

  return (
    <div>
      <PageHeader title="商談管理" action={<Button onClick={openCreate}>新規登録</Button>} />
      {error && <QueryErrorBanner error={error} />}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="商談名・企業名で検索" />
        <div className="flex gap-1">
          {[
            { value: "all", label: "すべて" },
            { value: "open", label: "商談中" },
            { value: "won", label: "受注" },
            { value: "lost", label: "失注" },
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
            <TableHead>商談名</TableHead>
            <TableHead>企業</TableHead>
            <TableHead>ステージ</TableHead>
            <TableHead>確度</TableHead>
            <TableHead>金額</TableHead>
            <TableHead>見込み日</TableHead>
            <TableHead>ステータス</TableHead>
          </TableRow>
        </TableHeader>
        <TableEmptyState
          colSpan={7}
          isLoading={!deals}
          isEmpty={filtered.length === 0}
          emptyMessage="商談が見つかりません"
        >
          {filtered.map((deal) => (
            <TableRow
              key={deal.id}
              className="cursor-pointer"
              onClick={() => router.push(`/crm/deals/${deal.id}`)}
            >
              <TableCell className="font-medium">{deal.title}</TableCell>
              <TableCell>{deal.bc_companies?.name ?? "—"}</TableCell>
              <TableCell>{dealStageLabels[deal.stage] ?? deal.stage}</TableCell>
              <TableCell>{deal.probability != null ? `${deal.probability}%` : "—"}</TableCell>
              <TableCell>
                {deal.amount != null ? `¥${deal.amount.toLocaleString()}` : "—"}
              </TableCell>
              <TableCell>{deal.expected_close_date ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={dealStatusColors[deal.status]}>
                  {dealStatusLabels[deal.status] ?? deal.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableEmptyState>
      </Table>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "商談編集" : "商談登録"}
        onSave={() => handleSave(showToast)}
        onDelete={editData.id ? () => handleDelete(showToast) : undefined}
      >
        <div className="space-y-4">
          <div>
            <Label>商談名 *</Label>
            <Input
              value={editData.title ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
              className={errors?.title ? "border-destructive" : ""}
            />
            {errors?.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label>企業</Label>
            <Select
              value={editData.company_id ?? ""}
              onValueChange={(v) => setEditData((p) => ({ ...p, company_id: v || null }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="企業を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未選択</SelectItem>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>連絡先</Label>
            <Select
              value={editData.contact_id ?? ""}
              onValueChange={(v) => setEditData((p) => ({ ...p, contact_id: v || null }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="連絡先を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未選択</SelectItem>
                {(contacts ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.last_name} {c.first_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ステージ</Label>
              <Select
                value={editData.stage ?? "initial"}
                onValueChange={(v) => {
                  const stage = v as "initial" | "proposal" | "negotiation" | "closing";
                  setEditData((p) => ({
                    ...p,
                    stage,
                    probability: dealStageProbability[stage] ?? p.probability,
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dealStageLabels).map(([value, label]) => (
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
                value={editData.status ?? "open"}
                onValueChange={(v) =>
                  setEditData((p) => ({
                    ...p,
                    status: v as "open" | "won" | "lost",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dealStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>確度（{editData.probability ?? 0}%）</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={editData.probability ?? 0}
              onChange={(e) => setEditData((p) => ({ ...p, probability: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>金額</Label>
              <Input
                type="number"
                value={editData.amount ?? ""}
                onChange={(e) =>
                  setEditData((p) => ({
                    ...p,
                    amount: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="¥"
              />
            </div>

            <div>
              <Label>見込み日</Label>
              <Input
                type="date"
                value={editData.expected_close_date ?? ""}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, expected_close_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>説明</Label>
            <Textarea
              value={editData.description ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
