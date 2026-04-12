"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTabParam } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import {
  loadProjectDetail,
  updateProjectById,
  deleteProjectById,
  addTeam,
  deleteTeamById,
  addTeamMembers,
  updateTeamMember as repoUpdateTeamMember,
  removeTeamMember,
  fetchOrgEmployeesForTeam,
  type TeamWithMembers,
} from "@/lib/hooks/use-projects";
import type { Project, ProjectTeamMember, Profile } from "@/types/database";

export function useProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("overview");

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

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);

    const result = await loadProjectDetail(id, organization.id);
    setProject(result.project);
    setTeams(result.teams);

    setLoading(false);
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
    load();
  }, [id, organization, load]);

  const startEditing = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditStatus(project.status);
    setEditStartDate(project.start_date ?? "");
    setEditEndDate(project.end_date ?? "");
    setEditOpen(true);
  };

  const saveEdit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!project || !editName.trim() || !organization)
      return { success: false, error: "入力が不足しています" };
    setSavingEdit(true);
    const result = await updateProjectById(project.id, organization.id, {
      name: editName,
      description: editDescription,
      status: editStatus,
      startDate: editStartDate,
      endDate: editEndDate,
    });
    if (result.success) {
      setEditOpen(false);
      await load();
    }
    setSavingEdit(false);
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "プロジェクトの更新に失敗しました"),
    };
  };

  const handleDeleteProject = async (): Promise<{ success: boolean; error?: string }> => {
    if (!project || !organization) return { success: false, error: "プロジェクトが見つかりません" };
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    const result = await deleteProjectById(project.id, organization.id);
    if (result.success) {
      router.push("/projects");
    }
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "プロジェクトの削除に失敗しました"),
    };
  };

  const openTeamDialog = () => {
    setNewTeamName("");
    setNewTeamDescription("");
    setTeamDialogOpen(true);
  };

  const handleAddTeam = async (): Promise<{ success: boolean; error?: string }> => {
    if (!project || !newTeamName.trim())
      return { success: false, error: "チーム名を入力してください" };
    setSavingTeam(true);
    const result = await addTeam(project.id, {
      name: newTeamName,
      description: newTeamDescription,
    });
    if (result.success) {
      setTeamDialogOpen(false);
      await load();
    }
    setSavingTeam(false);
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "チームの追加に失敗しました"),
    };
  };

  const handleDeleteTeam = async (
    teamId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    const result = await deleteTeamById(teamId);
    if (result.success) {
      await load();
    }
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "チームの削除に失敗しました"),
    };
  };

  const openMemberDialog = async (teamId: string) => {
    setMemberTeamId(teamId);
    setSelectedEmployeeIds([]);
    setMemberRole("member");
    setMemberJoinedAt(new Date().toISOString().slice(0, 10));

    if (organization) {
      const team = teams.find((t) => t.id === teamId);
      const existingIds = new Set((team?.members ?? []).map((m) => m.user_id));
      const emps = await fetchOrgEmployeesForTeam(organization.id, existingIds);
      setAllEmployees(emps);
    }

    setMemberDialogOpen(true);
  };

  const handleAddMembers = async (): Promise<{ success: boolean; error?: string }> => {
    if (!memberTeamId || selectedEmployeeIds.length === 0)
      return { success: false, error: "メンバーを選択してください" };
    setSavingMember(true);
    const result = await addTeamMembers(
      memberTeamId,
      selectedEmployeeIds,
      memberRole,
      memberJoinedAt
    );
    if (result.success) {
      setMemberDialogOpen(false);
      await load();
    }
    setSavingMember(false);
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "メンバーの追加に失敗しました"),
    };
  };

  const handleRemoveMember = async (
    memberId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    const result = await removeTeamMember(memberId);
    if (result.success) {
      await load();
    }
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "メンバーの削除に失敗しました"),
    };
  };

  const openEditMember = (member: ProjectTeamMember & { profiles: Profile }) => {
    setEditMemberId(member.id);
    setEditMemberRole(member.role);
    setEditMemberJoinedAt(member.joined_at ? member.joined_at.slice(0, 10) : "");
    setEditMemberLeftAt(member.left_at ? member.left_at.slice(0, 10) : "");
    setEditMemberOpen(true);
  };

  const saveEditMember = async (): Promise<{ success: boolean; error?: string }> => {
    if (!editMemberId) return { success: false, error: "メンバーが選択されていません" };
    setSavingMemberEdit(true);
    const result = await repoUpdateTeamMember(editMemberId, {
      role: editMemberRole,
      joinedAt: editMemberJoinedAt,
      leftAt: editMemberLeftAt,
    });
    if (result.success) {
      setEditMemberOpen(false);
      await load();
    }
    setSavingMemberEdit(false);
    return {
      success: result.success,
      error: result.success ? undefined : (result.error ?? "メンバー情報の更新に失敗しました"),
    };
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const totalMembers = teams.reduce((sum, t) => sum + t.members.length, 0);

  return {
    project,
    teams,
    loading,
    activeTab,
    setActiveTab,
    totalMembers,
    router,

    // 編集パネル
    editOpen,
    setEditOpen,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editStatus,
    setEditStatus,
    editStartDate,
    setEditStartDate,
    editEndDate,
    setEditEndDate,
    savingEdit,
    startEditing,
    saveEdit,
    handleDeleteProject,

    // チーム追加パネル
    teamDialogOpen,
    setTeamDialogOpen,
    newTeamName,
    setNewTeamName,
    newTeamDescription,
    setNewTeamDescription,
    savingTeam,
    openTeamDialog,
    handleAddTeam,
    handleDeleteTeam,

    // メンバー追加パネル
    memberDialogOpen,
    setMemberDialogOpen,
    allEmployees,
    selectedEmployeeIds,
    memberRole,
    setMemberRole,
    memberJoinedAt,
    setMemberJoinedAt,
    savingMember,
    openMemberDialog,
    handleAddMembers,
    handleRemoveMember,
    toggleEmployee,

    // メンバー編集パネル
    editMemberOpen,
    setEditMemberOpen,
    editMemberRole,
    setEditMemberRole,
    editMemberJoinedAt,
    setEditMemberJoinedAt,
    editMemberLeftAt,
    setEditMemberLeftAt,
    savingMemberEdit,
    openEditMember,
    saveEditMember,
  };
}
