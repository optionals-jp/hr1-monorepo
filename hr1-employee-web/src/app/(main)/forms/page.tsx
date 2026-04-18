"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { useForms } from "@/features/recruiting/hooks/use-forms";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { formTargetLabels } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { Input } from "@hr1/shared-ui/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@hr1/shared-ui/lib/utils";
import { LayoutList, User, Users, UsersRound, SlidersHorizontal, X } from "lucide-react";

const targetTabs = [
  { value: "all", label: "すべて", icon: LayoutList },
  { value: "applicant", label: "候補者向け", icon: User },
  { value: "employee", label: "社内向け", icon: Users },
  { value: "both", label: "両方", icon: UsersRound },
];

export default function FormsPage() {
  const router = useRouter();

  const { data: forms = [], isLoading, error: formsError, mutate: mutateForms } = useForms();

  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const fromTs = createdFrom ? new Date(createdFrom).getTime() : null;
    const toTs = createdTo ? new Date(createdTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return forms.filter((form) => {
      if (targetFilter !== "all" && form.target !== targetFilter) return false;

      if (keyword) {
        const haystack = [form.title, form.description ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      const createdTs = new Date(form.created_at).getTime();
      if (fromTs !== null && createdTs < fromTs) return false;
      if (toTs !== null && createdTs > toTs) return false;

      return true;
    });
  }, [forms, search, targetFilter, createdFrom, createdTo]);

  const hasDateFilter = createdFrom || createdTo;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="フォーム管理"
        description="書類選考用フォームの作成・管理"
        sticky={false}
        border={false}
        action={
          <Link href="/forms/new">
            <Button variant="primary">フォームを作成</Button>
          </Link>
        }
      />

      <QueryErrorBanner error={formsError} onRetry={() => mutateForms()} />

      <StickyFilterBar>
        <TabBar tabs={targetTabs} activeTab={targetFilter} onTabChange={setTargetFilter} />
        <SearchBar value={search} onChange={setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {hasDateFilter && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  作成日：{createdFrom || "指定なし"} 〜 {createdTo || "指定なし"}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreatedFrom("");
                      setCreatedTo("");
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">作成日</div>
            <div
              className="px-2 py-1 space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  max={createdTo || undefined}
                  className="h-8 w-36"
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  min={createdFrom || undefined}
                  className="h-8 w-36"
                />
              </div>
              {hasDateFilter && (
                <button
                  type="button"
                  className={cn(
                    "text-xs text-muted-foreground hover:text-foreground",
                    "cursor-pointer"
                  )}
                  onClick={() => {
                    setCreatedFrom("");
                    setCreatedTo("");
                  }}
                >
                  クリア
                </button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>説明</TableHead>
              <TableHead>作成日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage="フォームがありません"
            >
              {filtered.map((form) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/forms/${form.id}`)}
                >
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formTargetLabels[form.target] ?? form.target}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {form.description ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(form.created_at), "yyyy/MM/dd")}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
