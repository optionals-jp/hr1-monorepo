"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import type { Task, TaskAssignee, Project, ProjectTeam } from "@/types/database";
import {
  loadTaskDetail,
  updateTaskById,
  deleteTaskById,
  updateAssigneeStatus,
  removeAssignee,
  addAssignees,
  fetchEmployeesForAssign,
  fetchProjectsForEdit,
  fetchTeamsForEdit,
  updateTaskStatus,
} from "@/lib/hooks/use-tasks";

type TaskWithRelations = Task & {
  creator?: { display_name: string | null; email: string } | null;
  projects?: { id: string; name: string } | null;
  project_teams?: { id: string; name: string } | null;
};

type AssigneeRow = TaskAssignee & {
  profiles?: { display_name: string | null; email: string; position: string | null } | null;
};

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
}

export type { TaskWithRelations, AssigneeRow, Employee };

export function useTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [assignees, setAssignees] = useState<AssigneeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 編集パネル
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editScope, setEditScope] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 担当者追加パネル
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  // プロジェクト・チーム一覧（編集用）
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<ProjectTeam[]>([]);

  const fetchTask = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const result = await loadTaskDetail(id, organization.id);
      if (!result.task) {
        router.push("/tasks");
        return;
      }
      setTask(result.task as TaskWithRelations);
      setAssignees((result.assignees ?? []) as AssigneeRow[]);
    } catch {
      return { fetchError: true };
    } finally {
      setLoading(false);
    }
    return { fetchError: false };
  }, [organization, id, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const openEditPanel = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ?? "");
    setEditScope(task.scope);
    setEditProjectId(task.project_id ?? "");
    setEditTeamId(task.team_id ?? "");
    setEditOpen(true);

    if (organization) {
      fetchProjectsForEdit(organization.id).then((data) => setProjects(data));
    }
  };

  const handleSaveEdit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!task || !editTitle.trim() || !organization) return { success: false };
    setSavingEdit(true);
    const result = await updateTaskById(task.id, organization.id, {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      dueDate: editDueDate,
      scope: editScope,
      projectId: editProjectId,
      teamId: editTeamId,
    });
    if (result.success) {
      setEditOpen(false);
      await fetchTask();
    }
    setSavingEdit(false);
    return result;
  };

  const handleStatusChange = async (
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!task || !organization) return { success: false };
    const result = await updateTaskStatus(task.id, organization.id, newStatus);
    if (result.success) {
      await fetchTask();
    }
    return result;
  };

  const handleDelete = async (): Promise<{ success: boolean; error?: string }> => {
    if (!task || !organization || !window.confirm("削除してもよろしいですか？"))
      return { success: false };
    const result = await deleteTaskById(task.id, organization.id);
    if (result.success) {
      router.push("/tasks");
    }
    return result;
  };

  const handleAssigneeStatusChange = async (
    assigneeId: string,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await updateAssigneeStatus(assigneeId, newStatus);
    if (result.success) {
      await fetchTask();
    }
    return result;
  };

  const handleRemoveAssignee = async (
    assigneeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.confirm("削除してもよろしいですか？")) return { success: false };
    const result = await removeAssignee(assigneeId);
    if (result.success) {
      await fetchTask();
    }
    return result;
  };

  const openAssignDialog = async () => {
    if (!organization) return;
    const existingIds = new Set(assignees.map((a) => a.user_id));
    const emps = await fetchEmployeesForAssign(organization.id, existingIds);
    setAllEmployees(emps);
    setSelectedEmployeeIds([]);
    setAssignDialogOpen(true);
  };

  const handleAddAssignees = async (): Promise<{ success: boolean; error?: string }> => {
    if (!task || selectedEmployeeIds.length === 0) return { success: false };
    setSavingAssign(true);
    const result = await addAssignees(task.id, selectedEmployeeIds);
    if (result.success) {
      setAssignDialogOpen(false);
      await fetchTask();
    }
    setSavingAssign(false);
    return result;
  };

  const handleEditScopeChange = (scope: string) => {
    setEditScope(scope);
    if (scope !== "project" && scope !== "team") {
      setEditProjectId("");
      setEditTeamId("");
    }
    if (scope !== "team") setEditTeamId("");
  };

  const handleEditProjectChange = (v: string | null) => {
    if (v) setEditProjectId(v);
    setEditTeamId("");
  };

  const toggleSelectedEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // チーム一覧取得（editScope=team時）
  useEffect(() => {
    if (editScope === "team" && editProjectId) {
      fetchTeamsForEdit(editProjectId).then((data) => setTeams(data));
    }
  }, [editScope, editProjectId]);

  const completedCount = assignees.filter((a) => a.status === "completed").length;

  return {
    task,
    assignees,
    loading,
    editOpen,
    setEditOpen,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editPriority,
    setEditPriority,
    editDueDate,
    setEditDueDate,
    editScope,
    editProjectId,
    editTeamId,
    setEditTeamId,
    savingEdit,
    assignDialogOpen,
    setAssignDialogOpen,
    selectedEmployeeIds,
    allEmployees,
    savingAssign,
    projects,
    teams,
    completedCount,
    openEditPanel,
    handleSaveEdit,
    handleStatusChange,
    handleDelete,
    handleAssigneeStatusChange,
    handleRemoveAssignee,
    openAssignDialog,
    handleAddAssignees,
    handleEditScopeChange,
    handleEditProjectChange,
    toggleSelectedEmployee,
  };
}
