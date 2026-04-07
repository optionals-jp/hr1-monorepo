"use client";

import Link from "next/link";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { ProfileInfoList } from "@/components/ui/profile-info-list";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useApplicantDetailPage } from "@/lib/hooks/use-applicant-detail";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { TimelineTab } from "@/features/applicants/components/timeline-tab";
import { ExternalLink, FileText, User, Star, ScrollText } from "lucide-react";
import { format } from "date-fns";
import {
  applicationStatusLabels as statusLabels,
  applicationStatusColors as statusColors,
} from "@/lib/constants";

const tabs = [
  { value: "profile", label: "プロフィール", icon: User },
  { value: "forms", label: "フォーム", icon: FileText },
  { value: "evaluations", label: "評価", icon: Star },
  { value: "timeline", label: "ログ", icon: ScrollText },
];

export default function ApplicantDetailPage() {
  const {
    id,
    profile,
    applications,
    evaluations,
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
          <Button onClick={handleOpenMessage} disabled={creatingThread}>
            メッセージを送る
          </Button>
        }
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

              <div>
                <h2 className="text-sm font-semibold mb-2">評価サマリー</h2>
                {evaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">評価がありません</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">
                        {evaluations.filter((e) => e.status === "submitted").length}件 提出済み
                      </Badge>
                      <Badge variant="outline">
                        {evaluations.filter((e) => e.status === "draft").length}件 下書き
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>評価テンプレート</TableHead>
                          <TableHead>評価者</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead>日時</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evaluations.slice(0, 5).map((ev) => (
                          <TableRow key={ev.id}>
                            <TableCell className="font-medium">
                              {ev.evaluation_templates?.title ?? "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ev.evaluator?.display_name ?? ev.evaluator?.email ?? "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ev.status === "submitted" ? "secondary" : "outline"}>
                                {ev.status === "submitted" ? "提出済み" : "下書き"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(ev.submitted_at ?? ev.created_at), "yyyy/MM/dd")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
