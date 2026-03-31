"use client";

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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { projectStatusLabels, projectStatusColors, teamMemberRoleLabels } from "@/lib/constants";
import { format } from "date-fns";
import { Trash2, Plus, Users, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjectDetail } from "@/lib/hooks/use-project-detail";

const tabs = [
  { value: "overview", label: "概要" },
  { value: "teams", label: "チーム" },
];

export default function ProjectDetailPage() {
  const { showToast } = useToast();
  const h = useProjectDetail();

  const saveEdit = async () => {
    const result = await h.saveEdit();
    if (result.success) {
      showToast("プロジェクトを更新しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleDeleteProject = async () => {
    const result = await h.handleDeleteProject();
    if (result.success) {
      showToast("プロジェクトを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleAddTeam = async () => {
    const result = await h.handleAddTeam();
    if (result.success) {
      showToast("チームを追加しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const result = await h.handleDeleteTeam(teamId);
    if (result.success) {
      showToast("チームを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleAddMembers = async () => {
    const result = await h.handleAddMembers();
    if (result.success) {
      showToast("メンバーを追加しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await h.handleRemoveMember(memberId);
    if (result.success) {
      showToast("メンバーを削除しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  const saveEditMember = async () => {
    const result = await h.saveEditMember();
    if (result.success) {
      showToast("メンバー情報を更新しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.project) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        プロジェクトが見つかりません
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={h.project.name}
        description="プロジェクト詳細"
        sticky={false}
        breadcrumb={[{ label: "プロジェクト", href: "/projects" }]}
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count = tab.value === "teams" ? h.teams.length : undefined;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => h.setActiveTab(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                  h.activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                )}
                {h.activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {h.activeTab === "overview" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="space-y-4 max-w-3xl">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">プロジェクト情報</h2>
                  <Button variant="outline" size="sm" onClick={h.startEditing}>
                    編集
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">プロジェクト名</span>
                    <span className="font-medium">{h.project.name}</span>
                  </div>
                  {h.project.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">説明</span>
                      <span className="text-right max-w-xs">{h.project.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ステータス</span>
                    <Badge variant={projectStatusColors[h.project.status]}>
                      {projectStatusLabels[h.project.status]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">チーム数</span>
                    <span>{h.teams.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">総メンバー数</span>
                    <span>{h.totalMembers} 名</span>
                  </div>
                  {h.project.start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">開始日</span>
                      <span>{format(new Date(h.project.start_date), "yyyy/MM/dd")}</span>
                    </div>
                  )}
                  {h.project.end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">終了日</span>
                      <span>{format(new Date(h.project.end_date), "yyyy/MM/dd")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成日</span>
                    <span>{format(new Date(h.project.created_at), "yyyy/MM/dd")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {h.activeTab === "teams" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="max-w-4xl space-y-4">
            <div className="flex justify-end">
              <Button onClick={h.openTeamDialog}>
                <Plus className="h-4 w-4 mr-1" />
                チームを追加
              </Button>
            </div>

            {h.teams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">チームがありません</div>
            ) : (
              h.teams.map((team) => (
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
                          onClick={() => h.openMemberDialog(team.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          メンバー追加
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTeam(team.id)}
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
                              onClick={() => h.router.push(`/employees/${member.user_id}`)}
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
                                      h.openEditMember(member);
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
                                      handleRemoveMember(member.id);
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
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="プロジェクトを編集"
        onSave={saveEdit}
        saving={h.savingEdit}
        saveDisabled={!h.editName.trim()}
        onDelete={handleDeleteProject}
        deleteLabel="プロジェクトを削除"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>プロジェクト名 *</Label>
            <Input value={h.editName} onChange={(e) => h.setEditName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={h.editDescription}
              onChange={(e) => h.setEditDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>ステータス</Label>
            <Select value={h.editStatus} onValueChange={(v) => v && h.setEditStatus(v)}>
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
                value={h.editStartDate}
                onChange={(e) => h.setEditStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={h.editEndDate}
                onChange={(e) => h.setEditEndDate(e.target.value)}
                min={h.editStartDate || undefined}
              />
            </div>
          </div>
        </div>
      </EditPanel>

      {/* チーム追加パネル */}
      <EditPanel
        open={h.teamDialogOpen}
        onOpenChange={h.setTeamDialogOpen}
        title="チームを追加"
        onSave={handleAddTeam}
        saving={h.savingTeam}
        saveDisabled={!h.newTeamName.trim()}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>チーム名 *</Label>
            <Input
              value={h.newTeamName}
              onChange={(e) => h.setNewTeamName(e.target.value)}
              placeholder="フロントエンドチーム"
            />
          </div>
          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={h.newTeamDescription}
              onChange={(e) => h.setNewTeamDescription(e.target.value)}
              placeholder="チームの役割"
            />
          </div>
        </div>
      </EditPanel>

      {/* メンバー追加パネル */}
      <EditPanel
        open={h.memberDialogOpen}
        onOpenChange={h.setMemberDialogOpen}
        title="メンバーを追加"
        onSave={handleAddMembers}
        saving={h.savingMember}
        saveDisabled={h.selectedEmployeeIds.length === 0}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>役割</Label>
            <Select value={h.memberRole} onValueChange={(v) => v && h.setMemberRole(v)}>
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
              value={h.memberJoinedAt}
              onChange={(e) => h.setMemberJoinedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>社員を選択</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {h.allEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">追加できる社員がいません</p>
              ) : (
                h.allEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-3 cursor-pointer py-1">
                    <Checkbox
                      checked={h.selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={() => h.toggleEmployee(emp.id)}
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
        open={h.editMemberOpen}
        onOpenChange={h.setEditMemberOpen}
        title="メンバー情報を編集"
        onSave={saveEditMember}
        saving={h.savingMemberEdit}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>役割</Label>
            <Select value={h.editMemberRole} onValueChange={(v) => v && h.setEditMemberRole(v)}>
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
              value={h.editMemberJoinedAt}
              onChange={(e) => h.setEditMemberJoinedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>離脱日</Label>
            <Input
              type="date"
              value={h.editMemberLeftAt}
              onChange={(e) => h.setEditMemberLeftAt(e.target.value)}
              min={h.editMemberJoinedAt || undefined}
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
