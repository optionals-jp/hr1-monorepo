"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Application } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/ui/search-bar";
import { X, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as appStatusLabels,
  applicationStatusColors as appStatusColors,
} from "@/lib/constants";

interface JobApplicantsTabProps {
  applications: Application[];
  applicantSearch: string;
  setApplicantSearch: (v: string) => void;
  applicantStatusFilter: string;
  setApplicantStatusFilter: (v: string) => void;
}

export function JobApplicantsTab({
  applications,
  applicantSearch,
  setApplicantSearch,
  applicantStatusFilter,
  setApplicantStatusFilter,
}: JobApplicantsTabProps) {
  return (
    <>
      <SearchBar
        value={applicantSearch}
        onChange={setApplicantSearch}
        placeholder="名前・メールで検索"
      />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {applicantStatusFilter !== "all" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                ステータス：{appStatusLabels[applicantStatusFilter] ?? applicantStatusFilter}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setApplicantStatusFilter("all");
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
          <DropdownMenuItem className="py-2" onClick={() => setApplicantStatusFilter("all")}>
            <span className={cn(applicantStatusFilter === "all" && "font-medium")}>すべて</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(appStatusLabels).map(([key, label]) => (
            <DropdownMenuItem
              className="py-2"
              key={key}
              onClick={() => setApplicantStatusFilter(key)}
            >
              <span className={cn(applicantStatusFilter === key && "font-medium")}>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>応募日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const filtered = applications.filter((app) => {
                const profile = app.profiles as unknown as {
                  display_name: string | null;
                  email: string;
                } | null;
                if (applicantStatusFilter !== "all" && app.status !== applicantStatusFilter)
                  return false;
                if (!applicantSearch) return true;
                const q = applicantSearch.toLowerCase();
                return (
                  (profile?.display_name ?? "").toLowerCase().includes(q) ||
                  (profile?.email ?? "").toLowerCase().includes(q)
                );
              });
              if (filtered.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {applications.length === 0 ? "応募者がいません" : "該当する応募者がいません"}
                    </TableCell>
                  </TableRow>
                );
              }
              return filtered.map((app) => {
                const profile = app.profiles as unknown as {
                  display_name: string | null;
                  email: string;
                } | null;
                return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Link
                        href={`/applications/${app.id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                            {(profile?.display_name ?? profile?.email ?? "-")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{profile?.display_name ?? "-"}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{profile?.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={appStatusColors[app.status] ?? "default"}>
                        {appStatusLabels[app.status] ?? app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(app.applied_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
