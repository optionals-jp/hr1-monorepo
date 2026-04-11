"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { ProfileInfoList } from "@/features/recruiting/components/profile-info-list";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useApplicantDetailPage } from "@/features/recruiting/hooks/use-applicant-detail";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TimelineTab } from "@/features/recruiting/components/timeline-tab";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { FileText, User, ScrollText, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
} from "@/lib/constants";

const tabs = [
  { value: "profile", label: "プロフィール", icon: User },
  { value: "forms", label: "フォーム", icon: FileText },
  { value: "evaluation", label: "評価", icon: ClipboardCheck },
  { value: "timeline", label: "ログ", icon: ScrollText },
];

export default function ApplicantDetailPage() {
  const {
    profile,
    applications,
    formResponses,
    interviewSlots,
    timelineEvents,
    filteredTimeline,
    loading,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    eventFilter,
    setEventFilter,
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
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {activeTab === "profile" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard className="self-start">
              <div className="flex flex-col mb-6">
                <Avatar className="size-24 mb-3">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name ?? ""} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-3xl font-semibold">
                      {(profile.display_name ?? profile.email)[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="text-lg font-semibold">{profile.display_name ?? "-"}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">応募者</Badge>
                  {profile.invited_at ? (
                    <Badge variant="secondary">招待済み</Badge>
                  ) : (
                    <Badge variant="outline">未招待</Badge>
                  )}
                </div>
              </div>
              <ProfileInfoList profile={profile} />
            </SectionCard>

            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-sm font-semibold mb-2">応募ログ</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>求人</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>応募日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h2 className="text-sm font-semibold mb-2">直近の面接予定</h2>
                {interviewSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">面接予定がありません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>面接名</TableHead>
                        <TableHead>日時</TableHead>
                        <TableHead>場所</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviewSlots.slice(0, 5).map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium">
                            {slot.interviews?.title ?? "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(slot.start_at), "yyyy/MM/dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {slot.interviews?.location ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </PageContent>
      )}

      {activeTab === "forms" && (
        <PageContent>
          {formResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-24 mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                <FileText className="size-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">提出されたフォームはありません</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                この応募者がフォームを提出すると、ここに表示されます。
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {formResponses.map((form, i) => (
                <div key={`${form.form_id}-${i}`} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{form.form_title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(form.submitted_at), "yyyy/MM/dd HH:mm")}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {form.fields.map((f, j) => (
                      <div key={j} className="flex gap-8">
                        <span className="text-muted-foreground w-32 shrink-0">{f.label}</span>
                        <span className="whitespace-pre-wrap">{f.value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageContent>
      )}

      {activeTab === "evaluation" && (
        <PageContent>
          <EvaluationTab targetUserId={profile.id} targetType="applicant" />
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
