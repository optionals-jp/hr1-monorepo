"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
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
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Application } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  active: "選考中",
  offered: "内定",
  rejected: "不採用",
  withdrawn: "辞退",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  offered: "secondary",
  rejected: "destructive",
  withdrawn: "outline",
};

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

  const { data: applications = [], isLoading } = useQuery<Application[]>(
    organization ? `applications-${organization.id}` : null,
    async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, jobs(*), profiles:applicant_id(id, email, display_name, role), application_steps(*)")
        .eq("organization_id", organization!.id)
        .order("applied_at", { ascending: false });
      return data ?? [];
    }
  );

  const filtered = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name =
        (app.profiles as unknown as { display_name: string | null })
          ?.display_name ?? "";
      const email =
        (app.profiles as unknown as { email: string })?.email ?? "";
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
    const allCompleted = steps.every(
      (s) => s.status === "completed" || s.status === "skipped"
    );
    if (allCompleted && steps.length > 0) return "全ステップ完了";
    return statusLabels[app.status];
  };

  return (
    <>
      <PageHeader
        title="応募管理"
        description="応募の確認・選考ステップの管理"
        sticky={false}
      />

      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {statusTabs.map((tab) => {
            const count = tab.value === "all"
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
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {count}
                </span>
                {statusFilter === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center h-12 border-b px-4 sm:px-6 md:px-8">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="応募者名・求人名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent h-12"
        />
        </div>
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
                        <span className="font-medium">{profile?.display_name ?? profile?.email ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{app.jobs?.title ?? "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{getCurrentStepLabel(app)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[app.status]}>
                        {statusLabels[app.status]}
                      </Badge>
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
    </>
  );
}
