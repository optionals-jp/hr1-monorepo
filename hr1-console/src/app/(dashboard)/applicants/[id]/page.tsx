"use client";

import Link from "next/link";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useApplicantDetailPage } from "@/lib/hooks/use-applicant-detail";
import type { TimelineEvent } from "@/lib/hooks/use-applicant-detail";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { ExternalLink, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
  StepStatus,
  ApplicationStatus,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

const tabs = [
  { value: "profile", label: "プロフィール" },
  { value: "evaluations", label: "評価" },
  { value: "timeline", label: "ログ" },
  { value: "audit", label: "変更ログ" },
];

export default function ApplicantDetailPage() {
  const {
    id,
    organization,
    profile,
    applications,
    timelineEvents,
    filteredTimeline,
    loading,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    eventFilter,
    setEventFilter,
    historySearch,
    setHistorySearch,
    handleOpenMessage,
    creatingThread,
  } = useApplicantDetailPage();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        応募者が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={profile.display_name ?? profile.email}
        description="応募者詳細"
        breadcrumb={[{ label: "応募者一覧", href: "/applicants" }]}
        sticky={false}
        action={
          <Button size="sm" onClick={handleOpenMessage} disabled={creatingThread}>
            メッセージを送る
          </Button>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count = tab.value === "timeline" ? timelineEvents.length : undefined;
            return (
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
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                )}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "profile" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>プロフィール</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">名前</span>
                  <span>{profile.display_name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">メール</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ロール</span>
                  <Badge variant="secondary">応募者</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">登録日</span>
                  <span>{format(new Date(profile.created_at), "yyyy/MM/dd")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>応募ログ</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">応募がありません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>求人</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>応募日</TableHead>
                        <TableHead className="w-15"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.jobs?.title ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={statusColors[app.status]}>
                              {statusLabels[app.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(app.applied_at), "yyyy/MM/dd")}
                          </TableCell>
                          <TableCell>
                            <Link href={`/applications/${app.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContent>
      )}

      {activeTab === "evaluations" && (
        <PageContent>
          <EvaluationTab targetUserId={id} targetType="applicant" />
        </PageContent>
      )}

      {activeTab === "timeline" && (
        <TimelineTab
          timelineEvents={timelineEvents}
          filteredTimeline={filteredTimeline}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          eventFilter={eventFilter}
          setEventFilter={setEventFilter}
          historySearch={historySearch}
          setHistorySearch={setHistorySearch}
        />
      )}

      {activeTab === "audit" && organization && (
        <div className="px-4 sm:px-6 md:px-8 py-6">
          <AuditLogPanel organizationId={organization.id} tableName="profiles" recordId={id} />
        </div>
      )}
    </>
  );
}

function TimelineTab({
  timelineEvents,
  filteredTimeline,
  statusFilter,
  setStatusFilter,
  eventFilter,
  setEventFilter,
  historySearch,
  setHistorySearch,
}: {
  timelineEvents: TimelineEvent[];
  filteredTimeline: TimelineEvent[];
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  eventFilter: string | null;
  setEventFilter: (v: string | null) => void;
  historySearch: string;
  setHistorySearch: (v: string) => void;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {(statusFilter || eventFilter) && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {statusFilter && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  ステータス：{statusFilter}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusFilter(null);
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )}
              {eventFilter && (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  カテゴリ：{eventFilter}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEventFilter(null);
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )}
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto py-2">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">ステータス</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="py-2">
              <DropdownMenuItem className="py-2" onClick={() => setStatusFilter(null)}>
                <span className={cn(!statusFilter && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[...new Set(timelineEvents.map((ev) => ev.label))].map((label) => (
                <DropdownMenuItem
                  className="py-2"
                  key={label}
                  onClick={() => setStatusFilter(label)}
                >
                  <span className={cn(statusFilter === label && "font-medium")}>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2">カテゴリ</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="py-2">
              <DropdownMenuItem className="py-2" onClick={() => setEventFilter(null)}>
                <span className={cn(!eventFilter && "font-medium")}>すべて</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {[...new Set(timelineEvents.map((ev) => ev.category))].map((cat) => (
                <DropdownMenuItem className="py-2" key={cat} onClick={() => setEventFilter(cat)}>
                  <span className={cn(eventFilter === cat && "font-medium")}>{cat}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <SearchBar
        value={historySearch}
        onChange={setHistorySearch}
        placeholder="求人名・イベントで検索"
      />
      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>カテゴリ</TableHead>
              <TableHead>イベント</TableHead>
              <TableHead>関連求人</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTimeline.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {timelineEvents.length === 0 ? "ログがありません" : "該当するログがありません"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTimeline.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Badge variant="outline">{ev.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{ev.eventType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ev.source !== "-" ? ev.source : ""}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ev.status === StepStatus.Completed ||
                        ev.status === ApplicationStatus.Offered
                          ? "secondary"
                          : ev.status === ApplicationStatus.Rejected
                            ? "destructive"
                            : ev.status === ApplicationStatus.Withdrawn ||
                                ev.status === StepStatus.Skipped
                              ? "outline"
                              : "default"
                      }
                    >
                      {ev.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
