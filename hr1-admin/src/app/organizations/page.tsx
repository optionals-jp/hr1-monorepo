"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import { contractStatusLabels, contractStatusColors } from "@/lib/constants";
import { Search } from "lucide-react";
import type { Contract } from "@/types/database";

export default function OrganizationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: contracts,
    error,
    mutate,
  } = useQuery<Contract[]>("admin-organizations", async () => {
    const { data } = await getSupabase()
      .from("contracts")
      .select("*, organizations(*), plans(*)")
      .order("created_at", { ascending: false });
    return (data as Contract[]) ?? [];
  });

  const filtered = (contracts ?? []).filter((c) => {
    const matchSearch =
      !search ||
      c.organizations?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <PageHeader title="契約企業" description="HR1と契約中の企業一覧" />
      <PageContent>
        <QueryErrorBanner error={error} onRetry={() => mutate()} />

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="企業名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="active">契約中</SelectItem>
              <SelectItem value="trial">トライアル</SelectItem>
              <SelectItem value="suspended">停止中</SelectItem>
              <SelectItem value="cancelled">解約済み</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>企業名</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead className="text-right">契約社員数</TableHead>
                <TableHead className="text-right">月額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>契約開始日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() =>
                    router.push(`/organizations/${contract.organization_id}`)
                  }
                >
                  <TableCell className="font-medium">
                    {contract.organizations?.name ?? "-"}
                  </TableCell>
                  <TableCell>{contract.plans?.name ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {contract.contracted_employees.toLocaleString()}名
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ¥{formatCurrency(contract.monthly_price)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contractStatusColors[contract.status] ?? "outline"
                      }
                    >
                      {contractStatusLabels[contract.status] ?? contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(contract.start_date).toLocaleDateString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {contracts && contracts.length > 0
                      ? "条件に一致する企業がありません"
                      : "契約企業がありません"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </>
  );
}
