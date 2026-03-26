"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
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
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import type { Job } from "@/types/database";
import { jobStatusLabels as statusLabels, jobStatusColors as statusColors } from "@/lib/constants";
import { Trash2 } from "lucide-react";

const pageTabs = [
  { value: "open", label: "公開中" },
  { value: "draft", label: "ドラフト" },
  { value: "closed", label: "終了" },
  { value: "archived", label: "アーカイブ" },
];

interface AppCounts {
  total: number;
  offered: number;
}

export default function JobsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("open");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: jobs = [],
    isLoading,
    error: jobsError,
    mutate: mutateJobs,
  } = useQuery<Job[]>(organization ? `jobs-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("jobs")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

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

  const tabCounts = pageTabs.map((tab) => ({
    ...tab,
    count: jobs.filter((j) => j.status === tab.value).length,
  }));

  const handleDeleteJob = async (job: Job) => {
    if (!organization) return;
    if (!window.confirm(`「${job.title}」を削除しますか？`)) return;
    setDeletingId(job.id);
    try {
      const { count } = await getSupabase()
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("job_id", job.id);
      if (count && count > 0) {
        showToast(`この求人には${count}件の応募があるため削除できません`, "error");
        return;
      }
      const { error } = await getSupabase()
        .from("jobs")
        .delete()
        .eq("id", job.id)
        .eq("organization_id", organization.id);
      if (error) throw error;
      mutateJobs();
      showToast("求人を削除しました");
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = jobs.filter((job) => {
    if (job.status !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.department ?? "").toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={jobsError} onRetry={() => mutateJobs()} />
      <PageHeader
        title="求人管理"
        description="求人の作成・管理"
        sticky={false}
        border={false}
        action={
          <Link href="/jobs/new">
            <Button>求人を作成</Button>
          </Link>
        }
      />

      <div className="sticky top-14 z-10">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
          {tabCounts.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 text-xs tabular-nums",
                  activeTab === tab.value ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・部署・勤務地で検索" />
      </div>

      <div className="bg-white">
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={8}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage={jobs.length === 0 ? "求人がありません" : "該当する求人がありません"}
            >
              {filtered.map((job) => {
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
                    <TableCell>
                      <button
                        type="button"
                        disabled={deletingId === job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job);
                        }}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
