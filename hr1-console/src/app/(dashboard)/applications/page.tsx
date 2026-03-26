"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import type { Application, Job } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
} from "@/lib/constants";

const statusTabs = [
  { value: "all", label: "すべて" },
  { value: "active", label: "選考中" },
  { value: "offered", label: "内定" },
  { value: "rejected", label: "不採用" },
  { value: "withdrawn", label: "辞退" },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterJobId, setFilterJobId] = useState<string>("all");

  const { data: jobs = [] } = useQuery<Job[]>(
    organization ? `jobs-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("jobs")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("title");
      return data ?? [];
    }
  );

  const {
    data: applications = [],
    isLoading,
    error: applicationsError,
    mutate: mutateApplications,
  } = useQuery<Application[]>(organization ? `applications-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("applications")
      .select(
        "*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)"
      )
      .eq("organization_id", organization!.id)
      .order("applied_at", { ascending: false });
    return data ?? [];
  });

  const filtered = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (filterJobId !== "all" && app.job_id !== filterJobId) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (app.profiles as unknown as { display_name: string | null })?.display_name ?? "";
      const email = (app.profiles as unknown as { email: string })?.email ?? "";
      const jobTitle = app.jobs?.title ?? "";
      if (
        !name.toLowerCase().includes(s) &&
        !email.toLowerCase().includes(s) &&
        !jobTitle.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const getCurrentStepLabel = (app: Application): string => {
    const steps = app.application_steps ?? [];
    const inProgress = steps.find((s) => s.status === "in_progress");
    if (inProgress) return inProgress.label;
    const allCompleted = steps.every((s) => s.status === "completed" || s.status === "skipped");
    if (allCompleted && steps.length > 0) return "全ステップ完了";
    return statusLabels[app.status];
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={applicationsError} onRetry={() => mutateApplications()} />
      <PageHeader
        title="応募管理"
        description="応募の確認・選考ステップの管理"
        sticky={false}
        border={false}
      />

      <div className="sticky top-14 z-10">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
          {statusTabs.map((tab) => {
            const count =
              tab.value === "all"
                ? applications.length
                : applications.filter((a) => a.status === tab.value).length;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                  statusFilter === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                {statusFilter === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <SearchBar value={search} onChange={setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
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
      </div>

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>応募者</TableHead>
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
                const profile = app.profiles as unknown as {
                  display_name: string | null;
                  email: string;
                };
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
      </div>
    </div>
  );
}
