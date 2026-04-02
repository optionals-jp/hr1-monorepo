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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import {
  ExternalLink,
  SlidersHorizontal,
  X,
  UserPlus,
  FileCheck,
  ClipboardList,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
  StepStatus,
  ApplicationStatus,
} from "@/lib/constants";

const CATEGORY_ICONS: Record<string, typeof UserPlus> = {
  アカウント: UserPlus,
  応募: FileCheck,
  選考: ClipboardList,
  フォーム: FileText,
  面接: CalendarCheck,
};

const tabs = [
  { value: "profile", label: "プロフィール" },
  { value: "evaluations", label: "評価" },
  { value: "timeline", label: "ログ" },
];

export default function ApplicantDetailPage() {
  const {
    id,
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
    <div className="flex flex-col">
      <PageHeader
        title={profile.display_name ?? profile.email}
        description="応募者詳細"
        breadcrumb={[{ label: "応募者一覧", href: "/applicants" }]}
        sticky={false}
        border={false}
        action={
          <Button size="sm" onClick={handleOpenMessage} disabled={creatingThread}>
            メッセージを送る
          </Button>
        }
      />

      <StickyFilterBar>
        <TabBar
          tabs={tabs.map((tab) => ({
            ...tab,
            count: tab.value === "timeline" ? timelineEvents.length : undefined,
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </StickyFilterBar>

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

            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold mb-2">応募ログ</h2>
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
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        応募がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((app) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
        />
      )}
    </div>
  );
}

function TimelineTab({
  timelineEvents,
  filteredTimeline,
  statusFilter,
  setStatusFilter,
  eventFilter,
  setEventFilter,
}: {
  timelineEvents: TimelineEvent[];
  filteredTimeline: TimelineEvent[];
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  eventFilter: string | null;
  setEventFilter: (v: string | null) => void;
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
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4">
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {timelineEvents.length === 0 ? "ログがありません" : "該当するログがありません"}
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {filteredTimeline.map((ev) => {
                const Icon = CATEGORY_ICONS[ev.category] ?? ClipboardList;
                const badgeVariant =
                  ev.status === StepStatus.Completed || ev.status === ApplicationStatus.Offered
                    ? "secondary"
                    : ev.status === ApplicationStatus.Rejected
                      ? "destructive"
                      : ev.status === ApplicationStatus.Withdrawn ||
                          ev.status === StepStatus.Skipped
                        ? "outline"
                        : "default";

                return (
                  <div key={ev.id} className="relative flex gap-3 py-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ev.actor && (
                          <span className="inline-flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="bg-muted text-muted-foreground text-[8px] font-medium">
                                {ev.actor[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{ev.actor}</span>
                          </span>
                        )}
                        <span className="text-sm">{ev.eventType}</span>
                        <Badge variant={badgeVariant} className="text-xs">
                          {ev.label}
                        </Badge>
                        {ev.source !== "-" && (
                          <span className="text-xs text-muted-foreground">{ev.source}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(ev.date), "yyyy/MM/dd HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
