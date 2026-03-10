"use client";

import Link from "next/link";
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
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Job } from "@/types/database";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function JobsPage() {
  const router = useRouter();
  const { organization } = useOrg();

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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="求人管理"
        description="求人の作成・管理"
        action={
          <Link href="/jobs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              求人を作成
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>勤務地</TableHead>
              <TableHead>雇用形態</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  求人がありません
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
