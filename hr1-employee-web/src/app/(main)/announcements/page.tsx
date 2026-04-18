"use client";

import { Fragment, useMemo, useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { useAnnouncements } from "@/lib/hooks/use-announcements";
import { cn } from "@hr1/shared-ui/lib/utils";
import { isWithinJstDateRange } from "@hr1/shared-ui/lib/date-range";
import { Pin, ChevronDown, LayoutList, Users, User, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";

const TARGET_LABELS: Record<"all" | "employee" | "applicant", string> = {
  all: "全員",
  employee: "社員",
  applicant: "応募者",
};

const targetTabs = [
  { value: "all", label: "すべて", icon: LayoutList },
  { value: "target_all", label: "全員", icon: Users },
  { value: "target_employee", label: "社員", icon: User },
];

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading, error, mutate } = useAnnouncements();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [filterPublishedFrom, setFilterPublishedFrom] = useState<string>("");
  const [filterPublishedTo, setFilterPublishedTo] = useState<string>("");

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const matchesTarget =
        targetFilter === "all" ||
        (targetFilter === "target_all" && a.target === "all") ||
        (targetFilter === "target_employee" && a.target === "employee");
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
      const matchesPublished =
        (!filterPublishedFrom && !filterPublishedTo) ||
        (a.published_at !== null &&
          isWithinJstDateRange(a.published_at, filterPublishedFrom, filterPublishedTo));
      return matchesTarget && matchesSearch && matchesPublished;
    });
  }, [announcements, targetFilter, search, filterPublishedFrom, filterPublishedTo]);

  const hasPublishedFilter = Boolean(filterPublishedFrom || filterPublishedTo);

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} onRetry={() => mutate()} />
      <PageHeader title="お知らせ" description="社内のお知らせ" sticky={false} border={false} />

      <StickyFilterBar>
        <TabBar tabs={targetTabs} activeTab={targetFilter} onTabChange={setTargetFilter} />
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・本文で検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {hasPublishedFilter && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  公開日：
                  {filterPublishedFrom || "指定なし"} 〜 {filterPublishedTo || "指定なし"}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterPublishedFrom("");
                      setFilterPublishedTo("");
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
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">公開日</div>
            <div
              className="px-2 py-1 space-y-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filterPublishedFrom}
                  onChange={(e) => setFilterPublishedFrom(e.target.value)}
                  max={filterPublishedTo || undefined}
                  className="h-8 w-36"
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Input
                  type="date"
                  value={filterPublishedTo}
                  onChange={(e) => setFilterPublishedTo(e.target.value)}
                  min={filterPublishedFrom || undefined}
                  className="h-8 w-36"
                />
              </div>
              {hasPublishedFilter && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFilterPublishedFrom("");
                    setFilterPublishedTo("");
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
              <TableHead>公開日</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage={
                search || targetFilter !== "all" || hasPublishedFilter
                  ? "該当するお知らせがありません"
                  : "お知らせはありません"
              }
            >
              {filtered.map((a) => {
                const isExpanded = expandedId === a.id;
                return (
                  <Fragment key={a.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span className="font-medium truncate">{a.title}</span>
                          {a.is_pinned && (
                            <Badge variant="default" className="shrink-0 text-[10px]">
                              固定
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TARGET_LABELS[a.target]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {a.published_at ? format(new Date(a.published_at), "yyyy/MM/dd") : "-"}
                      </TableCell>
                      <TableCell>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4}>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {a.body}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
