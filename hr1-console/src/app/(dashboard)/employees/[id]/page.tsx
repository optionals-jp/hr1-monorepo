"use client";

import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useCreateMessageThread } from "@/lib/hooks/use-create-message-thread";
import { useEmployeeDetail, type MembershipRecord } from "@/lib/hooks/use-employee-detail";
import {
  genderLabels,
  projectStatusLabels,
  projectStatusColors,
  teamMemberRoleLabels,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { useRouter } from "next/navigation";
import { FolderKanban, LogIn, LogOut, User, Wrench, Star, History } from "lucide-react";

import { format, differenceInYears, differenceInMonths, parseISO } from "date-fns";

const pageTabs = [
  { value: "profile", label: "プロフィール", icon: User },
  { value: "projects", label: "プロジェクト", icon: FolderKanban },
  { value: "skills", label: "スキル", icon: Wrench },
  { value: "evaluations", label: "評価", icon: Star },
  { value: "audit", label: "変更ログ", icon: History },
];

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "personal", label: "個人情報" },
  { value: "departments", label: "部署" },
];

function calcAge(birthDate: string | null): string {
  if (!birthDate) return "-";
  const age = differenceInYears(new Date(), new Date(birthDate));
  return `${age}歳`;
}

function calcTenure(hireDate: string | null): string {
  if (!hireDate) return "-";
  const now = new Date();
  const hire = new Date(hireDate);
  const years = differenceInYears(now, hire);
  const months = differenceInMonths(now, hire) % 12;
  if (years === 0) return `${months}ヶ月`;
  if (months === 0) return `${years}年`;
  return `${years}年${months}ヶ月`;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-8">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="whitespace-pre-wrap">{children}</span>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const h = useEmployeeDetail(id);

  const { handleOpenMessage, creatingThread } = useCreateMessageThread({
    participantId: h.profile?.id,
    participantType: "employee",
    organizationId: h.organization?.id,
  });

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        社員が見つかりません
      </div>
    );
  }

  const currentAddress = [
    h.profile.current_postal_code && `〒${h.profile.current_postal_code}`,
    h.profile.current_prefecture,
    h.profile.current_city,
    h.profile.current_street_address,
    h.profile.current_building,
  ]
    .filter(Boolean)
    .join(" ");

  const registeredAddress = [
    h.profile.registered_postal_code && `〒${h.profile.registered_postal_code}`,
    h.profile.registered_prefecture,
    h.profile.registered_city,
    h.profile.registered_street_address,
    h.profile.registered_building,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col">
      <PageHeader
        title={h.profile.display_name ?? h.profile.email}
        description="社員詳細"
        breadcrumb={[{ label: "社員一覧", href: "/employees" }]}
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={h.startEditing}>
              編集
            </Button>
            <Button size="sm" onClick={handleOpenMessage} disabled={creatingThread}>
              メッセージを送る
            </Button>
          </div>
        }
      />

      <StickyFilterBar>
        <TabBar tabs={pageTabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
      </StickyFilterBar>

      {h.activeTab === "profile" && (
        <PageContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 左カラム: プロフィール */}
            <SectionCard className="self-start">
              <div className="flex flex-col mb-6">
                <Avatar className="size-24 mb-3">
                  <AvatarFallback className="bg-green-100 text-green-700 text-3xl font-semibold">
                    {(h.profile.display_name ?? h.profile.email)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{h.profile.display_name ?? "-"}</h2>
                <p className="text-sm text-muted-foreground">{h.profile.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">
                    {h.profile.role === "admin" ? "管理者" : "社員"}
                  </Badge>
                  {h.profile.position && <Badge variant="outline">{h.profile.position}</Badge>}
                </div>
                {h.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {h.departments.map((d) => (
                      <Badge key={d.id} variant="secondary">
                        {d.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6 text-sm">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    基本情報
                  </h3>
                  <div className="space-y-4">
                    <InfoRow label="ふりがな">{h.profile.name_kana || "-"}</InfoRow>
                    <InfoRow label="生年月日">
                      {h.profile.birth_date
                        ? `${format(new Date(h.profile.birth_date), "yyyy/MM/dd")}（${calcAge(h.profile.birth_date)}）`
                        : "-"}
                    </InfoRow>
                    <InfoRow label="性別">
                      {h.profile.gender
                        ? (genderLabels[h.profile.gender] ?? h.profile.gender)
                        : "-"}
                    </InfoRow>
                    <InfoRow label="電話番号">{h.profile.phone || "-"}</InfoRow>
                    <InfoRow label="入社日">
                      {h.profile.hire_date
                        ? `${format(new Date(h.profile.hire_date), "yyyy/MM/dd")}（勤続${calcTenure(h.profile.hire_date)}）`
                        : "-"}
                    </InfoRow>
                    <InfoRow label="登録日">
                      {format(new Date(h.profile.created_at), "yyyy/MM/dd")}
                    </InfoRow>
                  </div>
                </div>

                {/* 住所 */}
                <div className="border-t pt-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    住所
                  </h3>
                  <div className="space-y-4">
                    <InfoRow label="現住所">{currentAddress || "-"}</InfoRow>
                    <InfoRow label="住民票住所">{registeredAddress || "-"}</InfoRow>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 右カラム: 関連情報 */}
            <div className="lg:col-span-2 space-y-8">
              {/* プロジェクト */}
              <div>
                <h2 className="text-sm font-semibold mb-2">現在のプロジェクト</h2>
                {(() => {
                  const active = h.memberships.filter((m) => !m.left_at);
                  if (active.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4">
                        参加中のプロジェクトはありません
                      </p>
                    );
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>プロジェクト</TableHead>
                          <TableHead>チーム</TableHead>
                          <TableHead>ロール</TableHead>
                          <TableHead>参加日</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {active.map((m) => (
                          <TableRow
                            key={m.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/projects/${m.team.project.id}`)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{m.team.project.name}</span>
                                <Badge variant={projectStatusColors[m.team.project.status]}>
                                  {projectStatusLabels[m.team.project.status]}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{m.team.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{teamMemberRoleLabels[m.role]}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(parseISO(m.joined_at), "yyyy/MM/dd")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>

              {/* スキル */}
              <div>
                <h2 className="text-sm font-semibold mb-2">スキル</h2>
                {h.skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">スキルが登録されていません</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {h.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 資格 */}
              <div>
                <h2 className="text-sm font-semibold mb-2">資格・認定</h2>
                {h.certifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">資格が登録されていません</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>資格名</TableHead>
                        <TableHead>スコア</TableHead>
                        <TableHead>取得日</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {h.certifications.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {cert.score != null ? `${cert.score}点` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {cert.acquired_date
                              ? format(new Date(cert.acquired_date), "yyyy/MM")
                              : "-"}
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

      {h.activeTab === "projects" && (
        <PageContent>
          <div className="max-w-2xl space-y-6">
            {/* 在籍ログタイムライン */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">在籍ログ</h2>
              {h.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">ログがありません</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.75 top-2 bottom-2 w-0.5 bg-gray-200" />
                  <div className="space-y-0">
                    {(() => {
                      const events: {
                        type: "joined" | "left";
                        date: string;
                        membership: MembershipRecord;
                      }[] = [];
                      for (const m of h.memberships) {
                        events.push({ type: "joined", date: m.joined_at, membership: m });
                        if (m.left_at) {
                          events.push({ type: "left", date: m.left_at, membership: m });
                        }
                      }
                      events.sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                      );
                      return events.map((event) => (
                        <div
                          key={`${event.membership.id}-${event.type}`}
                          className="relative flex items-start gap-4 py-3"
                        >
                          <div
                            className={cn(
                              "relative z-10 flex h-7.75 w-7.75 items-center justify-center rounded-full border-2 bg-white shrink-0",
                              event.type === "joined" ? "border-green-400" : "border-gray-300"
                            )}
                          >
                            {event.type === "joined" ? (
                              <LogIn className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <LogOut className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-sm font-medium text-primary hover:underline cursor-pointer"
                                onClick={() =>
                                  router.push(`/projects/${event.membership.team.project.id}`)
                                }
                              >
                                {event.membership.team.project.name}
                              </span>
                              <span className="text-muted-foreground text-sm">/</span>
                              <span className="text-sm text-muted-foreground">
                                {event.membership.team.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.type === "joined" ? (
                                <span className="text-green-600">
                                  {teamMemberRoleLabels[event.membership.role]}として参加
                                </span>
                              ) : (
                                <span className="text-gray-500">チームから離脱</span>
                              )}
                              <span className="mx-1.5">·</span>
                              {format(parseISO(event.date), "yyyy年MM月dd日")}
                            </p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </section>
          </div>
        </PageContent>
      )}

      {h.activeTab === "skills" && (
        <PageContent>
          <div className="max-w-2xl space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">スキル</h2>
              {h.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">スキルが登録されていません</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {h.skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">資格・認定</h2>
              {h.certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">資格が登録されていません</p>
              ) : (
                <SectionCard>
                  <div className="space-y-3 text-sm">
                    {h.certifications.map((cert) => (
                      <div key={cert.id} className="flex justify-between">
                        <span>
                          {cert.name}
                          {cert.score != null && (
                            <span className="ml-1.5 text-muted-foreground">{cert.score}点</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {cert.acquired_date
                            ? format(new Date(cert.acquired_date), "yyyy/MM")
                            : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </section>
          </div>
        </PageContent>
      )}

      {h.activeTab === "evaluations" && (
        <PageContent>
          <EvaluationTab targetUserId={id} targetType="employee" />
        </PageContent>
      )}

      {h.activeTab === "audit" && h.organization && (
        <PageContent>
          <AuditLogPanel organizationId={h.organization.id} tableName="profiles" recordId={id} />
        </PageContent>
      )}

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="社員情報を編集"
        tabs={editTabs}
        activeTab={h.editTab}
        onTabChange={h.setEditTab}
        onSave={h.saveEdit}
        saving={h.saving}
      >
        {h.editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={h.editForm.name}
                onChange={(e) => h.updateField("name", e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label>氏名（カナ）</Label>
              <Input
                value={h.editForm.nameKana}
                onChange={(e) => h.updateField("nameKana", e.target.value)}
                placeholder="ヤマダ タロウ"
              />
            </div>
            <div className="space-y-2">
              <Label>メール</Label>
              <Input value={h.profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={h.editForm.position}
                onChange={(e) => h.updateField("position", e.target.value)}
                placeholder="エンジニア"
              />
            </div>
          </div>
        )}
        {h.editTab === "personal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input
                type="date"
                value={h.editForm.birthDate}
                onChange={(e) => h.updateField("birthDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <Select
                value={h.editForm.gender}
                onValueChange={(v) => v && h.updateField("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください">
                    {(v: string) => (v ? (genderLabels[v] ?? v) : "選択してください")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>入社日</Label>
              <Input
                type="date"
                value={h.editForm.hireDate}
                onChange={(e) => h.updateField("hireDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={h.editForm.phone}
                onChange={(e) => h.updateField("phone", e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-semibold">現住所</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">郵便番号</Label>
                  <Input
                    value={h.editForm.currentPostalCode}
                    onChange={(e) => h.updateField("currentPostalCode", e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={h.editForm.currentPrefecture}
                    onChange={(e) => h.updateField("currentPrefecture", e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={h.editForm.currentCity}
                  onChange={(e) => h.updateField("currentCity", e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={h.editForm.currentStreetAddress}
                  onChange={(e) => h.updateField("currentStreetAddress", e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={h.editForm.currentBuilding}
                  onChange={(e) => h.updateField("currentBuilding", e.target.value)}
                  placeholder="○○ビル 3F"
                />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Label className="text-muted-foreground text-xs font-semibold">住民票住所</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">郵便番号</Label>
                  <Input
                    value={h.editForm.registeredPostalCode}
                    onChange={(e) => h.updateField("registeredPostalCode", e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={h.editForm.registeredPrefecture}
                    onChange={(e) => h.updateField("registeredPrefecture", e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={h.editForm.registeredCity}
                  onChange={(e) => h.updateField("registeredCity", e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={h.editForm.registeredStreetAddress}
                  onChange={(e) => h.updateField("registeredStreetAddress", e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={h.editForm.registeredBuilding}
                  onChange={(e) => h.updateField("registeredBuilding", e.target.value)}
                  placeholder="○○ビル 3F"
                />
              </div>
            </div>
          </div>
        )}
        {h.editTab === "departments" && (
          <div className="space-y-3">
            {h.allDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署が登録されていません</p>
            ) : (
              h.allDepartments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={h.editDeptIds.includes(dept.id)}
                    onCheckedChange={() => h.toggleDept(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </EditPanel>
    </div>
  );
}
