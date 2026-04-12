"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  SummaryCards,
  type SummaryCardConfig,
} from "@hr1/shared-ui/components/layout/summary-cards";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@hr1/shared-ui/lib/utils";
import { useApplicationsPage } from "@/features/recruiting/hooks/use-applications-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  SlidersHorizontal,
  X,
  LayoutList,
  Loader2,
  CircleCheck,
  CircleX,
  LogOut,
  Users,
  GraduationCap,
  Briefcase,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
  ApplicationStatus,
} from "@/lib/constants";

const statusTabs = [
  { value: "all", label: "すべて", icon: LayoutList },
  { value: ApplicationStatus.Active, label: "選考中", icon: Loader2 },
  { value: ApplicationStatus.Offered, label: "内定", icon: CircleCheck },
  { value: ApplicationStatus.OfferAccepted, label: "内定承諾", icon: ThumbsUp },
  { value: ApplicationStatus.OfferDeclined, label: "内定辞退", icon: ThumbsDown },
  { value: ApplicationStatus.Rejected, label: "不採用", icon: CircleX },
  { value: ApplicationStatus.Withdrawn, label: "辞退", icon: LogOut },
];

type ApplicationsSummaryKey =
  | "total"
  | "newGrad"
  | "midCareer"
  | "active"
  | "offered"
  | "offerAccepted";

const summaryCards: readonly SummaryCardConfig<ApplicationsSummaryKey>[] = [
  { key: "total", label: "総応募数", icon: Users, iconClassName: "text-slate-600" },
  { key: "newGrad", label: "新卒", icon: GraduationCap, iconClassName: "text-blue-600" },
  { key: "midCareer", label: "中途", icon: Briefcase, iconClassName: "text-indigo-600" },
  { key: "active", label: "選考中", icon: Loader2, iconClassName: "text-amber-600" },
  { key: "offered", label: "内定", icon: CircleCheck, iconClassName: "text-emerald-600" },
  { key: "offerAccepted", label: "内定承諾", icon: ThumbsUp, iconClassName: "text-green-600" },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filterJobId,
    setFilterJobId,
    jobs,
    summary,
    isLoading,
    applicationsError,
    mutateApplications,
    filtered,
    getCurrentStepLabel,
  } = useApplicationsPage();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={applicationsError} onRetry={() => mutateApplications()} />
      <PageHeader
        title="応募"
        description="求人ごとの応募イベントと選考ステップの管理。1 人が複数求人に応募した場合は別々にカウント"
        sticky={false}
        border={false}
      />

      {/* サマリ（総応募数・新卒・中途・選考中・内定）。タブ絞り込みとは独立。 */}
      <div className="px-4 sm:px-6 md:px-8 pt-2 pb-4">
        <SummaryCards cards={summaryCards} values={summary} />
      </div>

      <StickyFilterBar>
        <TabBar tabs={statusTabs} activeTab={statusFilter} onTabChange={setStatusFilter} />
        <SearchBar value={search} onChange={setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {filterJobId !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  求人：{jobs.find((j) => j.id === filterJobId)?.title}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterJobId("all");
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
            <DropdownMenuItem className="py-2" onClick={() => setFilterJobId("all")}>
              <span className={cn(filterJobId === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {jobs.map((job) => (
              <DropdownMenuItem
                key={job.id}
                className="py-2"
                onClick={() => setFilterJobId(job.id)}
              >
                <span className={cn(filterJobId === job.id && "font-medium")}>{job.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>候補者</TableHead>
              <TableHead>求人</TableHead>
              <TableHead>現在のステップ</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>応募日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  応募がありません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((app) => {
                const profile = app.profiles;
                return (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/applications/${app.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                            {(profile?.display_name ?? profile?.email ?? "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {profile?.display_name ?? profile?.email ?? "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{app.jobs?.title ?? "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{getCurrentStepLabel(app)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[app.status]}>{statusLabels[app.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(app.applied_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableSection>
    </div>
  );
}
