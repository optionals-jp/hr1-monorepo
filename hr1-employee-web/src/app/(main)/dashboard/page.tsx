"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Hourglass,
  Inbox,
  MailOpen,
  MapPin,
  Siren,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { formatTime, formatYmdSlash, weekdayLabel } from "@hr1/shared-ui";
import {
  useRecruitingDashboard,
  type UpcomingInterviewEntry,
} from "@/features/recruiting/hooks/use-recruiting-dashboard";

type AlertSeverity = "critical" | "warn" | "info";

interface AlertRow {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  href: string;
  severity: AlertSeverity;
}

const severityStyles: Record<AlertSeverity, { bg: string; text: string; ring: string }> = {
  critical: {
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-1 ring-inset ring-red-200",
  },
  warn: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-1 ring-inset ring-amber-200",
  },
  info: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    ring: "ring-1 ring-inset ring-sky-200",
  },
};

type KpiKey =
  | "openJobs"
  | "activeApplications"
  | "interviewsThisWeek"
  | "offered"
  | "appliedThisMonth";

const kpiCards = [
  {
    key: "openJobs" as const,
    label: "公開中の求人",
    icon: Briefcase,
    iconClassName: "text-blue-600",
    href: "/jobs",
  },
  {
    key: "activeApplications" as const,
    label: "選考中",
    icon: Users,
    iconClassName: "text-emerald-600",
    href: "/applications?tab=active",
  },
  {
    key: "interviewsThisWeek" as const,
    label: "今週の面接",
    icon: CalendarDays,
    iconClassName: "text-violet-600",
    href: "/scheduling",
  },
  {
    key: "offered" as const,
    label: "内定提示中",
    icon: MailOpen,
    iconClassName: "text-amber-600",
    href: "/applications?tab=offered",
  },
  {
    key: "appliedThisMonth" as const,
    label: "今月の応募",
    icon: FileText,
    iconClassName: "text-sky-600",
    href: "/applications",
  },
];

function formatInterviewDateTime(iso: string): string {
  const d = new Date(iso);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const targetStart = new Date(d);
  targetStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
  );
  const time = formatTime(iso);
  if (diffDays === 0) return `今日 ${time}`;
  if (diffDays === 1) return `明日 ${time}`;
  return `${formatYmdSlash(iso)} (${weekdayLabel(d)}) ${time}`;
}

function ActionRequiredSection({ rows, totalAlerts }: { rows: AlertRow[]; totalAlerts: number }) {
  if (totalAlerts === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">対応が必要な項目はありません</p>
            <p className="text-xs text-muted-foreground">期限切れや未対応の応募者はいません。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visible = rows.filter((r) => r.count > 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Siren className="h-4 w-4 text-red-600" />
          今すぐ対応
          <span className="text-xs font-normal text-muted-foreground">（{totalAlerts}件）</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {visible.map((row) => {
            const style = severityStyles[row.severity];
            const Icon = row.icon;
            return (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${style.bg} ${style.text} ${style.ring}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{row.count}</span>
                  <span className="text-xs text-muted-foreground">件</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function UpcomingInterviewsSection({ entries }: { entries: UpcomingInterviewEntry[] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-violet-600" />
          直近の面接
          <span className="text-xs font-normal text-muted-foreground">（今後7日間・確定済み）</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" />
            今後7日間で確定済みの面接はありません
          </div>
        ) : (
          <ul className="divide-y">
            {entries.slice(0, 8).map((entry) => {
              const href = entry.applicationId
                ? `/applications/${entry.applicationId}`
                : `/scheduling/${entry.interviewId}`;
              return (
                <li key={entry.slotId}>
                  <Link
                    href={href}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex items-center gap-2 sm:w-44 sm:shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium tabular-nums">
                        {formatInterviewDateTime(entry.startAt)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.applicantName ?? "応募者未確定"}
                        <span className="text-muted-foreground font-normal">
                          {entry.jobTitle ? ` ・ ${entry.jobTitle}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{entry.title}</p>
                    </div>
                    {entry.location && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground max-w-40 truncate">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{entry.location}</span>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { isLoading, error, alerts, kpis, upcomingInterviews } = useRecruitingDashboard();

  const alertRows: AlertRow[] = [
    {
      key: "offers-expiring",
      label: "内定の有効期限切れ・3日以内",
      count: alerts.offersExpiring,
      icon: Hourglass,
      href: "/applications?tab=offered",
      severity: "critical",
    },
    {
      key: "steps-overdue",
      label: "期限超過の選考ステップ",
      count: alerts.stepsOverdue,
      icon: AlertTriangle,
      href: "/applications?tab=active",
      severity: "critical",
    },
    {
      key: "steps-due-today",
      label: "今日締切の選考ステップ",
      count: alerts.stepsDueToday,
      icon: Clock,
      href: "/applications?tab=active",
      severity: "warn",
    },
    {
      key: "interviews-scheduling",
      label: "日程調整中の面接",
      count: alerts.interviewsScheduling,
      icon: CalendarDays,
      href: "/scheduling",
      severity: "warn",
    },
    {
      key: "unread-applicant-messages",
      label: "応募者からの未読メッセージ",
      count: alerts.unreadApplicantMessages,
      icon: MailOpen,
      href: "/messages",
      severity: "info",
    },
  ];

  const totalAlerts = alertRows.reduce((sum, row) => sum + row.count, 0);

  const kpiValues: Record<KpiKey, number> = {
    openJobs: kpis.openJobs,
    activeApplications: kpis.activeApplications,
    interviewsThisWeek: kpis.interviewsThisWeek,
    offered: kpis.offered,
    appliedThisMonth: kpis.appliedThisMonth,
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={error} />
      <PageHeader
        title="HR1 Recruiting"
        description="採用状況と対応が必要な内容を一目で確認"
        sticky={false}
        border={false}
      />
      <div className="flex flex-col gap-6 px-4 pb-8 pt-2 sm:px-6 md:px-8">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              読み込み中...
            </CardContent>
          </Card>
        ) : (
          <>
            <ActionRequiredSection rows={alertRows} totalAlerts={totalAlerts} />

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">採用状況</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-5">
                {kpiCards.map((card) => {
                  const Icon = card.icon;
                  const value = kpiValues[card.key];
                  return (
                    <Link
                      key={card.key}
                      href={card.href}
                      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="transition-colors hover:border-primary/50 max-md:py-2 max-md:gap-0.5">
                        <CardHeader className="max-md:px-3">
                          <div className="flex items-center gap-2 max-md:gap-1.5">
                            <Icon className={`size-4 max-md:size-3 ${card.iconClassName}`} />
                            <p className="text-xs text-muted-foreground max-md:text-[10px]">
                              {card.label}
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent className="max-md:px-3">
                          <p className="text-2xl font-bold tabular-nums max-md:text-base">
                            {value}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>

            <UpcomingInterviewsSection entries={upcomingInterviews} />
          </>
        )}
      </div>
    </div>
  );
}
