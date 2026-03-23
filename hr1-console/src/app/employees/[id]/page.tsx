"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useCreateMessageThread } from "@/lib/use-create-message-thread";
import {
  genderLabels,
  projectStatusLabels,
  projectStatusColors,
  teamMemberRoleLabels,
} from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import type { Profile, Department, EmployeeSkill, EmployeeCertification } from "@/types/database";
import { useRouter } from "next/navigation";
import { FolderKanban, Users, LogIn, LogOut } from "lucide-react";

import { format, differenceInYears, differenceInMonths, parseISO } from "date-fns";

interface MembershipRecord {
  id: string;
  role: "leader" | "member";
  joined_at: string;
  left_at: string | null;
  team: { id: string; name: string; project: { id: string; name: string; status: string } };
}

const pageTabs = [
  { value: "profile", label: "プロフィール" },
  { value: "projects", label: "プロジェクト" },
  { value: "skills", label: "スキル" },
  { value: "evaluations", label: "評価" },
  { value: "audit", label: "変更履歴" },
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

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [certifications, setCertifications] = useState<EmployeeCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Editing state
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editName, setEditName] = useState("");
  const [editNameKana, setEditNameKana] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRegisteredAddress, setEditRegisteredAddress] = useState("");
  const [editCurrentAddress, setEditCurrentAddress] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { handleOpenMessage, creatingThread } = useCreateMessageThread({
    participantId: profile?.id,
    participantType: "employee",
    organizationId: organization?.id,
  });

  const load = async () => {
    if (!organization) return;
    setLoading(true);

    // まず、このユーザーが自社に所属しているか確認
    const { data: membership } = await getSupabase()
      .from("user_organizations")
      .select("user_id")
      .eq("user_id", id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (!membership) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: edData }] = await Promise.all([
      getSupabase().from("profiles").select("*").eq("id", id).single(),
      getSupabase()
        .from("employee_departments")
        .select("department_id, departments(id, name)")
        .eq("user_id", id),
    ]);

    setProfile(profileData);

    const depts = (edData ?? [])
      .map((row) => (row as unknown as { departments: Department }).departments)
      .filter(Boolean);
    setDepartments(depts);
    setAssignedDeptIds(depts.map((d) => d.id));

    const { data: allDepts } = await getSupabase()
      .from("departments")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name");
    setAllDepartments(allDepts ?? []);

    // プロジェクトチームメンバーシップを取得
    const { data: memberData } = await getSupabase()
      .from("project_team_members")
      .select("id, role, joined_at, left_at, project_teams(id, name, projects(id, name, status))")
      .eq("user_id", id)
      .order("joined_at", { ascending: false });

    const records: MembershipRecord[] = (memberData ?? []).map((row) => {
      const r = row as unknown as {
        id: string;
        role: "leader" | "member";
        joined_at: string;
        left_at: string | null;
        project_teams: {
          id: string;
          name: string;
          projects: { id: string; name: string; status: string };
        };
      };
      return {
        id: r.id,
        role: r.role,
        joined_at: r.joined_at,
        left_at: r.left_at,
        team: {
          id: r.project_teams.id,
          name: r.project_teams.name,
          project: r.project_teams.projects,
        },
      };
    });
    setMemberships(records);

    // スキル・資格を取得
    const [{ data: skillsData }, { data: certsData }] = await Promise.all([
      getSupabase().from("employee_skills").select("*").eq("user_id", id).order("sort_order"),
      getSupabase()
        .from("employee_certifications")
        .select("*")
        .eq("user_id", id)
        .order("sort_order"),
    ]);
    setSkills((skillsData as EmployeeSkill[]) ?? []);
    setCertifications((certsData as EmployeeCertification[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.display_name ?? "");
    setEditNameKana(profile.name_kana ?? "");
    setEditPosition(profile.position ?? "");
    setEditBirthDate(profile.birth_date ?? "");
    setEditGender(profile.gender ?? "");
    setEditHireDate(profile.hire_date ?? "");
    setEditPhone(profile.phone ?? "");
    setEditRegisteredAddress(profile.registered_address ?? "");
    setEditCurrentAddress(profile.current_address ?? "");
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);

    await getSupabase()
      .from("profiles")
      .update({
        display_name: editName.trim() || null,
        name_kana: editNameKana.trim() || null,
        position: editPosition.trim() || null,
        birth_date: editBirthDate || null,
        gender: editGender || null,
        hire_date: editHireDate || null,
        phone: editPhone.trim() || null,
        registered_address: editRegisteredAddress.trim() || null,
        current_address: editCurrentAddress.trim() || null,
      })
      .eq("id", profile.id);

    await getSupabase().from("employee_departments").delete().eq("user_id", profile.id);
    if (editDeptIds.length > 0) {
      await getSupabase()
        .from("employee_departments")
        .insert(editDeptIds.map((deptId) => ({ user_id: profile.id, department_id: deptId })));
    }

    setSaving(false);
    setEditing(false);
    await load();
  };

  const toggleDept = (deptId: string) => {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

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
        社員が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={profile.display_name ?? profile.email}
        description="社員詳細"
        breadcrumb={[{ label: "社員一覧", href: "/employees" }]}
        sticky={false}
        action={
          <Button size="sm" onClick={handleOpenMessage} disabled={creatingThread}>
            メッセージを送る
          </Button>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {pageTabs.map((tab) => (
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
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && (
        <PageContent>
          <div className="max-w-2xl space-y-4">
            {/* 基本情報 */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    編集
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">氏名</span>
                    <span>{profile.display_name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">氏名（カナ）</span>
                    <span>{profile.name_kana ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">メール</span>
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">部署</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {departments.length === 0 ? (
                        <span>-</span>
                      ) : (
                        departments.map((d) => (
                          <Badge key={d.id} variant="secondary">
                            {d.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">役職</span>
                    <span>{profile.position ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ロール</span>
                    <Badge variant="secondary">社員</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 個人情報 */}
            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">個人情報</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">生年月日</span>
                    <span>
                      {profile.birth_date
                        ? `${format(new Date(profile.birth_date), "yyyy/MM/dd")}（${calcAge(profile.birth_date)}）`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">性別</span>
                    <span>
                      {profile.gender ? (genderLabels[profile.gender] ?? profile.gender) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">入社日</span>
                    <span>
                      {profile.hire_date
                        ? `${format(new Date(profile.hire_date), "yyyy/MM/dd")}（勤続${calcTenure(profile.hire_date)}）`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">電話番号</span>
                    <span>{profile.phone ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">住民票住所</span>
                    <span className="text-right max-w-[60%]">
                      {profile.registered_address ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">現住所</span>
                    <span className="text-right max-w-[60%]">{profile.current_address ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">登録日</span>
                    <span>{format(new Date(profile.created_at), "yyyy/MM/dd")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContent>
      )}

      {activeTab === "projects" && (
        <PageContent>
          <div className="max-w-2xl space-y-6">
            {/* 現在のプロジェクト */}
            {(() => {
              const active = memberships.filter((m) => !m.left_at);
              return active.length > 0 ? (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                    現在のプロジェクト
                  </h2>
                  <div className="space-y-2">
                    {active.map((m) => (
                      <Card
                        key={m.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push(`/projects/${m.team.project.id}`)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 shrink-0">
                              <FolderKanban className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {m.team.project.name}
                                </span>
                                <Badge variant={projectStatusColors[m.team.project.status]}>
                                  {projectStatusLabels[m.team.project.status]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{m.team.name}</span>
                                <Badge variant="outline" className="text-xs py-0 px-1.5">
                                  {teamMemberRoleLabels[m.role]}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">
                              {format(parseISO(m.joined_at), "yyyy/MM/dd")} 〜
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : (
                <p className="text-sm text-muted-foreground">
                  現在参加中のプロジェクトはありません
                </p>
              );
            })()}

            {/* 在籍履歴タイムライン */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">在籍履歴</h2>
              {memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">履歴がありません</p>
              ) : (
                <div className="relative">
                  {/* タイムラインの縦線 */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-0">
                    {(() => {
                      // 全イベントを時系列に並べる（新しい順）
                      const events: {
                        type: "joined" | "left";
                        date: string;
                        membership: MembershipRecord;
                      }[] = [];

                      for (const m of memberships) {
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
                          {/* ドット */}
                          <div
                            className={cn(
                              "relative z-10 flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 bg-white shrink-0",
                              event.type === "joined" ? "border-green-400" : "border-gray-300"
                            )}
                          >
                            {event.type === "joined" ? (
                              <LogIn className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <LogOut className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>

                          {/* コンテンツ */}
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

      {activeTab === "skills" && (
        <PageContent>
          <div className="max-w-2xl space-y-6">
            {/* スキル */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">スキル</h2>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">スキルが登録されていません</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-sm py-1 px-3">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* 資格・認定 */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">資格・認定</h2>
              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">資格が登録されていません</p>
              ) : (
                <Card>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {certifications.map((cert) => (
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
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </PageContent>
      )}

      {activeTab === "evaluations" && (
        <PageContent>
          <EvaluationTab targetUserId={id} targetType="employee" />
        </PageContent>
      )}

      {activeTab === "audit" && organization && (
        <PageContent>
          <AuditLogPanel organizationId={organization.id} tableName="profiles" recordId={id} />
        </PageContent>
      )}

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="社員情報を編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={saveEdit}
        saving={saving}
      >
        {editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label>氏名（カナ）</Label>
              <Input
                value={editNameKana}
                onChange={(e) => setEditNameKana(e.target.value)}
                placeholder="ヤマダ タロウ"
              />
            </div>
            <div className="space-y-2">
              <Label>メール</Label>
              <Input value={profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder="エンジニア"
              />
            </div>
          </div>
        )}
        {editTab === "personal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <Select value={editGender} onValueChange={(v) => v && setEditGender(v)}>
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
                value={editHireDate}
                onChange={(e) => setEditHireDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label>住民票住所</Label>
              <Input
                value={editRegisteredAddress}
                onChange={(e) => setEditRegisteredAddress(e.target.value)}
                placeholder="東京都渋谷区..."
              />
            </div>
            <div className="space-y-2">
              <Label>現住所</Label>
              <Input
                value={editCurrentAddress}
                onChange={(e) => setEditCurrentAddress(e.target.value)}
                placeholder="東京都渋谷区..."
              />
            </div>
          </div>
        )}
        {editTab === "departments" && (
          <div className="space-y-3">
            {allDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署が登録されていません</p>
            ) : (
              allDepartments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editDeptIds.includes(dept.id)}
                    onCheckedChange={() => toggleDept(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </EditPanel>
    </>
  );
}
