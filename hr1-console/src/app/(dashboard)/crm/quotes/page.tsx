"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useCrmQuotes } from "@/lib/hooks/use-crm";
import { quoteStatusLabels, quoteStatusColors } from "@/lib/constants/crm";
import { Plus, Search, FileText } from "lucide-react";

const STATUS_TABS = [
  { key: "all", label: "すべて" },
  { key: "draft", label: "下書き" },
  { key: "sent", label: "送付済" },
  { key: "accepted", label: "承認済" },
  { key: "rejected", label: "却下" },
  { key: "expired", label: "期限切れ" },
];

export default function QuotesPage() {
  const { data: quotes, error } = useCrmQuotes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return (quotes ?? []).filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        q.title.toLowerCase().includes(s) ||
        q.quote_number.toLowerCase().includes(s) ||
        q.bc_companies?.name?.toLowerCase().includes(s)
      );
    });
  }, [quotes, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="見積書一覧"
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Link href="/crm/quotes/new">
            <Button>
              <Plus className="size-4 mr-1.5" />
              新規作成
            </Button>
          </Link>
        }
      />
      {error && <QueryErrorBanner error={error} />}

      {/* フィルタ */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="見積書を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-4 py-2 font-medium">見積番号</th>
                <th className="text-left px-4 py-2 font-medium">タイトル</th>
                <th className="text-left px-4 py-2 font-medium">取引先</th>
                <th className="text-left px-4 py-2 font-medium">商談</th>
                <th className="text-left px-4 py-2 font-medium">ステータス</th>
                <th className="text-right px-4 py-2 font-medium">合計金額</th>
                <th className="text-left px-4 py-2 font-medium">発行日</th>
                <th className="text-left px-4 py-2 font-medium">有効期限</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <FileText className="size-8 mx-auto mb-2 opacity-40" />
                    <p>見積書がありません</p>
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/crm/quotes/${q.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {q.quote_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{q.title}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {q.bc_companies?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{q.bc_deals?.title ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Badge variant={quoteStatusColors[q.status]}>
                        {quoteStatusLabels[q.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      ¥{q.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{q.issue_date}</td>
                    <td className="px-4 py-2 text-muted-foreground">{q.expiry_date ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
