"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditPanel } from "@/components/ui/edit-panel";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { projectStatusLabels, projectStatusColors, teamMemberRoleLabels } from "@/lib/constants";
import type { Project, ProjectTeam, ProjectTeamMember, Profile } from "@/types/database";
import { format } from "date-fns";
import { Trash2, Plus, Users, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface TeamWithMembers extends ProjectTeam {
  members: (ProjectTeamMember & { profiles: Profile })[];
}

const tabs = [
  { value: "overview", label: "概要" },
  { value: "teams", label: "チーム" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 編集パネル
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // チーム追加パネル
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  // メンバー追加パネル
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberTeamId, setMemberTeamId] = useState<string | null>(null);
  const [allEmployees, setAllEmployees] = useState<Profile[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState<string>("member");
  const [memberJoinedAt, setMemberJoinedAt] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // メンバー編集パネル
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<string>("member");
  const [editMemberJoinedAt, setEditMemberJoinedAt] = useState("");
  const [editMemberLeftAt, setEditMemberLeftAt] = useState("");
  const [savingMemberEdit, setSavingMemberEdit] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);

    const { data: proj } = await getSupabase()
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    setProject(proj);

    if (proj) {
      const { data: teamData } = await getSupabase()
        .from("project_teams")
        .select("*")
        .eq("project_id", id)
        .order("created_at");

      const teamIds = (teamData ?? []).map((t) => t.id);

      let membersData: Record<string, unknown>[] = [];
      if (teamIds.length > 0) {
        const { data } = await getSupabase()
          .from("project_team_members")
          .select("*, profiles:user_id(id, email, display_name, avatar_url, position, department)")
          .in("team_id", teamIds);
        membersData = (data ?? []) as Record<string, unknown>[];
      }

      const teamsWithMembers: TeamWithMembers[] = (teamData ?? []).map((team) => ({
        ...team,
        members: membersData
          .filter((m) => (m as { team_id: string }).team_id === team.id)
          .map((m) => m as unknown as ProjectTeamMember & { profiles: Profile }),
      }));

      setTeams(teamsWithMembers);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const startEditing = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditStatus(project.status);
    setEditStartDate(project.start_date ?? "");
    setEditEndDate(project.end_date ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!project || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await getSupabase()
        .from("projects")
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
          start_date: editStartDate || null,
          end_date: editEndDate || null,
        })
        .eq("id", project.id);
      if (error) throw error;
      setEditOpen(false);
      await load();
      showToast("プロジェクトを更新しました");
    } catch {
      showToast("プロジェクトの更新に失敗しました", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteProject = async () => {
    if (!project) return;
    if (!window.confirm("削除してもよろしいですか？")) return;
    try {
      const { error } = await getSupabase().from("projects").delete().eq("id", project.id);
      if (error) throw error;
      showToast("プロジェクトを削除しました");
      router.push("/projects");
    } catch {
      showToast("プロジェクトの削除に失敗しました", "error");
    }
  };

  const openTeamDialog = () => {
    setNewTeamName("");
    setNewTeamDescription("");
    setTeamDialogOpen(true);
  };

  const handleAddTeam = async () => {
    if (!project || !newTeamName.trim()) return;
    setSavingTeam(true);
    try {
      const { error } = await getSupabase()
        .from("project_teams")
        .insert({
          id: crypto.randomUUID(),
          project_id: project.id,
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
        });
      if (error) throw error;
      setTeamDialogOpen(false);
      await load();
      showToast("チームを追加しました");
    } catch {
      showToast("チームの追加に失敗しました", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    try {
      const { error } = await getSupabase().from("project_teams").delete().eq("id", teamId);
      if (error) throw error;
      await load();
      showToast("チームを削除しました");
    } catch {
      showToast("チームの削除に失敗しました", "error");
    }
  };

  const openMemberDialog = async (teamId: string) => {
    setMemberTeamId(teamId);
    setSelectedEmployeeIds([]);
    setMemberRole("member");
    setMemberJoinedAt(new Date().toISOString().slice(0, 10));

    if (organization) {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select("profiles!inner(id, email, display_name, position)")
        .eq("organization_id", organization.id)
        .eq("profiles.role", "employee");

      const profiles = (data ?? [])
        .map((row) => (row as unknown as { profiles: Profile }).profiles)
        .filter(Boolean);

      // 既にチームにいるメンバーを除外
      const team = teams.find((t) => t.id === teamId);
      const existingIds = new Set((team?.members ?? []).map((m) => m.user_id));
      setAllEmployees(profiles.filter((p) => !existingIds.has(p.id)));
    }

    setMemberDialogOpen(true);
  };

  const handleAddMembers = async () => {
    if (!memberTeamId || selectedEmployeeIds.length === 0) return;
    setSavingMember(true);
    try {
      const rows = selectedEmployeeIds.map((userId) => ({
        id: crypto.randomUUID(),
        team_id: memberTeamId,
        user_id: userId,
        role: memberRole,
        joined_at: memberJoinedAt || new Date().toISOString(),
      }));
      const { error } = await getSupabase().from("project_team_members").insert(rows);
      if (error) throw error;
      setMemberDialogOpen(false);
      await load();
      showToast("メンバーを追加しました");
    } catch {
      showToast("メンバーの追加に失敗しました", "error");
    } finally {
      setSavingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    try {
      const { error } = await getSupabase()
        .from("project_team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      await load();
      showToast("メンバーを削除しました");
    } catch {
      showToast("メンバーの削除に失敗しました", "error");
    }
  };

  const openEditMember = (member: ProjectTeamMember & { profiles: Profile }) => {
    setEditMemberId(member.id);
    setEditMemberRole(member.role);
    setEditMemberJoinedAt(member.joined_at ? member.joined_at.slice(0, 10) : "");
    setEditMemberLeftAt(member.left_at ? member.left_at.slice(0, 10) : "");
    setEditMemberOpen(true);
  };

  const saveEditMember = async () => {
    if (!editMemberId) return;
    setSavingMemberEdit(true);
    try {
      const { error } = await getSupabase()
        .from("project_team_members")
        .update({
          role: editMemberRole,
          joined_at: editMemberJoinedAt || new Date().toISOString(),
          left_at: editMemberLeftAt || null,
        })
        .eq("id", editMemberId);
      if (error) throw error;
      setEditMemberOpen(false);
      await load();
      showToast("メンバー情報を更新しました");
    } catch {
      showToast("メンバー情報の更新に失敗しました", "error");
    } finally {
      setSavingMemberEdit(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        プロジェクトが見つかりません
      </div>
    );
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={project.name}
        description="プロジェクト詳細"
        sticky={false}
        breadcrumb={[{ label: "プロジェクト", href: "/projects" }]}
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count = tab.value === "teams" ? teams.length : undefined;
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

      {activeTab === "overview" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="space-y-4 max-w-3xl">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">プロジェクト情報</h2>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    編集
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">プロジェクト名</span>
                    <span className="font-medium">{project.name}</span>
                  </div>
                  {project.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">説明</span>
                      <span className="text-right max-w-xs">{project.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス</span>
                    <Badge variant={projectStatusColors[project.status]}>
                      {projectStatusLabels[project.status]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">チーム数</span>
                    <span>{teams.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">総メンバー数</span>
                    <span>{totalMembers} 名</span>
                  </div>
                  {project.start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">開始日</span>
                      <span>{format(new Date(project.start_date), "yyyy/MM/dd")}</span>
                    </div>
                  )}
                  {project.end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">終了日</span>
                      <span>{format(new Date(project.end_date), "yyyy/MM/dd")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成日</span>
                    <span>{format(new Date(project.created_at), "yyyy/MM/dd")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "teams" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-4xl space-y-4">
            <div className="flex justify-end">
              <Button onClick={openTeamDialog}>
                <Plus className="h-4 w-4 mr-1" />
                チームを追加
              </Button>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">チームがありません</div>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{team.name}</h3>
                          {team.description && (
                            <p className="text-xs text-muted-foreground">{team.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMemberDialog(team.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          メンバー追加
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTeam(team.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {team.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        メンバーがいません
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>名前</TableHead>
                            <TableHead>役割</TableHead>
                            <TableHead>期間</TableHead>
                            <TableHead className="w-24" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {team.members.map((member) => (
                            <TableRow
                              key={member.id}
                              className="cursor-pointer"
                              onClick={() => router.push(`/employees/${member.user_id}`)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                                      {
                                        (member.profiles?.display_name ??
                                          member.profiles?.email ??
                                          "?")[0]
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <span className="font-medium">
                                      {member.profiles?.display_name ??
                                        member.profiles?.email ??
                                        "-"}
                                    </span>
                                    {member.profiles?.position && (
                                      <p className="text-xs text-muted-foreground">
                                        {member.profiles.position}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {teamMemberRoleLabels[member.role] ?? member.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {member.joined_at
                                  ? format(new Date(member.joined_at), "yyyy/MM/dd")
                                  : "-"}
                                {" 〜 "}
                                {member.left_at
                                  ? format(new Date(member.left_at), "yyyy/MM/dd")
                                  : ""}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditMember(member);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeMember(member.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* プロジェクト編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="プロジェクトを編集"
        onSave={saveEdit}
        saving={savingEdit}
        saveDisabled={!editName.trim()}
        onDelete={deleteProject}
        deleteLabel="プロジェクトを削除"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>プロジェクト名 *</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>ステータス</Label>
            <Select value={editStatus} onValueChange={(v) => v && setEditStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                min={editStartDate || undefined}
              />
            </div>
          </div>
        </div>
      </EditPanel>

      {/* チーム追加パネル */}
      <EditPanel
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        title="チームを追加"
        onSave={handleAddTeam}
        saving={savingTeam}
        saveDisabled={!newTeamName.trim()}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>チーム名 *</Label>
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="フロントエンドチーム"
            />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={newTeamDescription}
              onChange={(e) => setNewTeamDescription(e.target.value)}
              placeholder="チームの役割"
            />
          </div>
        </div>
      </EditPanel>

      {/* メンバー追加パネル */}
      <EditPanel
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        title="メンバーを追加"
        onSave={handleAddMembers}
        saving={savingMember}
        saveDisabled={selectedEmployeeIds.length === 0}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>役割</Label>
            <Select value={memberRole} onValueChange={(v) => v && setMemberRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">リーダー</SelectItem>
                <SelectItem value="member">メンバー</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>参加日</Label>
            <Input
              type="date"
              value={memberJoinedAt}
              onChange={(e) => setMemberJoinedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>社員を選択</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">追加できる社員がいません</p>
              ) : (
                allEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-3 cursor-pointer py-1">
                    <Checkbox
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                        {(emp.display_name ?? emp.email)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.display_name ?? emp.email}
                      </p>
                      {emp.position && (
                        <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </EditPanel>

      {/* メンバー編集パネル */}
      <EditPanel
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
        title="メンバー情報を編集"
        onSave={saveEditMember}
        saving={savingMemberEdit}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>役割</Label>
            <Select value={editMemberRole} onValueChange={(v) => v && setEditMemberRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">リーダー</SelectItem>
                <SelectItem value="member">メンバー</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>参加日</Label>
            <Input
              type="date"
              value={editMemberJoinedAt}
              onChange={(e) => setEditMemberJoinedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>離脱日</Label>
            <Input
              type="date"
              value={editMemberLeftAt}
              onChange={(e) => setEditMemberLeftAt(e.target.value)}
              min={editMemberJoinedAt || undefined}
            />
            <p className="text-xs text-muted-foreground">
              空欄の場合は現在も在籍中として扱われます
            </p>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
