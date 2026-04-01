"use client";

import Link from "next/link";
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
import { TableSection } from "@/components/layout/table-section";
import { SearchBar } from "@/components/ui/search-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { useJobsPage } from "@/lib/hooks/use-jobs-page";
import { TabBar } from "@/components/layout/tab-bar";
import { jobStatusLabels as statusLabels, jobStatusColors as statusColors } from "@/lib/constants";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const pageTabs = [
  { value: "open", label: "公開中" },
  { value: "draft", label: "ドラフト" },
  { value: "closed", label: "終了" },
  { value: "archived", label: "アーカイブ" },
];

export default function JobsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    deletingId,
    jobs,
    isLoading,
    jobsError,
    mutateJobs,
    appCounts,
    filtered,
    handleDeleteJob,
  } = useJobsPage();

  const tabCounts = pageTabs.map((tab) => ({
    ...tab,
    count: jobs.filter((j) => j.status === tab.value).length,
  }));

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

      <StickyFilterBar>
        <TabBar
          tabs={tabCounts}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as typeof activeTab)}
        />
        <SearchBar value={search} onChange={setSearch} placeholder="タイトル・部署・勤務地で検索" />
      </StickyFilterBar>

      <TableSection>
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          const result = await handleDeleteJob(job);
                          if (result.error) {
                            showToast(result.error, "error");
                          } else if (result.success) {
                            showToast("求人を削除しました");
                          }
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
      </TableSection>
    </div>
  );
}
