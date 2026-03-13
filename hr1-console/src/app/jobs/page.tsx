"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/database";
import { SlidersHorizontal, X } from "lucide-react";

const statusLabels: Record<string, string> = {
  open: "公開中",
  closed: "終了",
  draft: "下書き",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  closed: "secondary",
  draft: "outline",
};

interface AppCounts {
  total: number;
  offered: number;
}

export default function JobsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs = [], isLoading } = useQuery<Job[]>(
    organization ? `jobs-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("jobs")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  );

  const { data: appCounts = {} } = useQuery<Record<string, AppCounts>>(
    organization ? `job-app-counts-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("applications")
        .select("job_id, status")
        .eq("organization_id", organization!.id);

      const counts: Record<string, AppCounts> = {};
      for (const row of data ?? []) {
        if (!counts[row.job_id]) counts[row.job_id] = { total: 0, offered: 0 };
        counts[row.job_id].total++;
        if (row.status === "offered") counts[row.job_id].offered++;
      }
      return counts;
    }
  );

  const filtered = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.department ?? "").toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="求人管理"
        description="求人の作成・管理"
        border={false}
        action={
          <Link href="/jobs/new">
            <Button>求人を作成</Button>
          </Link>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="タイトル・部署・勤務地で検索" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {statusFilter !== "all" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                ステータス：{statusLabels[statusFilter] ?? statusFilter}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter("all");
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
          <DropdownMenuItem className="py-2" onClick={() => setStatusFilter("all")}>
            <span className={cn(statusFilter === "all" && "font-medium")}>すべて</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(statusLabels).map(([key, label]) => (
            <DropdownMenuItem className="py-2" key={key} onClick={() => setStatusFilter(key)}>
              <span className={cn(statusFilter === key && "font-medium")}>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>勤務地</TableHead>
              <TableHead>雇用形態</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">応募数</TableHead>
              <TableHead className="text-right">内定数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {jobs.length === 0 ? "求人がありません" : "該当する求人がありません"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => {
                const counts = appCounts[job.id] ?? { total: 0, offered: 0 };
                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department ?? "-"}</TableCell>
                    <TableCell>{job.location ?? "-"}</TableCell>
                    <TableCell>{job.employment_type ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[job.status]}>{statusLabels[job.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.total > 0 ? (
                        <span className="font-medium">{counts.total}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.offered > 0 ? (
                        <span className="font-medium text-green-600">{counts.offered}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
