"use client";

import { useState, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import {
  useTasks,
  useTaskEmployees,
  useTaskProjects,
  useTaskTeams,
  createTask,
  updateTaskStatus,
} from "@/lib/hooks/use-tasks";
import { taskStatusLabels, taskPriorityLabels, taskSourceLabels } from "@/lib/constants";

export function useTasksPage() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [saving, setSaving] = useState(false);

  // 新規作成フォーム
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newScope, setNewScope] = useState<string>("organization");
  const [newProjectId, setNewProjectId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignAll, setNewAssignAll] = useState(true);
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);

  // データ取得
  const { data: tasks = [], isLoading, error: tasksError, mutate } = useTasks();
  const { data: employees = [] } = useTaskEmployees();
  const { data: projects = [] } = useTaskProjects();
  const { data: teams = [] } = useTaskTeams(newProjectId, newScope);

  // フィルター
  const filtered = useMemo(() => {
    let rows = tasks;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") {
      rows = rows.filter((t) => t.status === filterStatus);
    }
    if (filterSource !== "all") {
      rows = rows.filter((t) => t.source === filterSource);
    }
    if (filterPriority !== "all") {
      rows = rows.filter((t) => t.priority === filterPriority);
    }
    return rows;
  }, [tasks, search, filterStatus, filterSource, filterPriority]);

  const openAddDialog = () => {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewScope("organization");
    setNewProjectId("");
    setNewTeamId("");
    setNewDueDate("");
    setNewAssignAll(true);
    setNewAssigneeIds([]);
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !user || !newTitle.trim()) return { success: false };
    setSaving(true);

    const result = await createTask(
      organization.id,
      user.id,
      {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        scope: newScope,
        projectId: newProjectId,
        teamId: newTeamId,
        dueDate: newDueDate,
        assignAll: newAssignAll,
        assigneeIds: newAssigneeIds,
      },
      employees
    );

    if (result.success) {
      setDialogOpen(false);
      mutate();
    }
    setSaving(false);
    return result;
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };
    const result = await updateTaskStatus(taskId, organization.id, newStatus);
    if (result.success) {
      mutate();
    }
    return result;
  };

  const toggleAssignee = (id: string) => {
    setNewAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleScopeChange = (scope: string) => {
    setNewScope(scope);
    if (scope !== "project" && scope !== "team") {
      setNewProjectId("");
      setNewTeamId("");
    }
    if (scope !== "team") setNewTeamId("");
  };

  const handleProjectChange = (v: string | null) => {
    if (v) setNewProjectId(v);
    setNewTeamId("");
  };

  const handleAssignAllChange = (assignAll: boolean) => {
    setNewAssignAll(assignAll);
    if (assignAll) {
      setNewAssigneeIds([]);
    }
  };

  const activeFilters = [
    filterStatus !== "all"
      ? {
          key: "status",
          label: `ステータス：${taskStatusLabels[filterStatus]}`,
          clear: () => setFilterStatus("all"),
        }
      : null,
    filterSource !== "all"
      ? {
          key: "source",
          label: `作成者：${taskSourceLabels[filterSource]}`,
          clear: () => setFilterSource("all"),
        }
      : null,
    filterPriority !== "all"
      ? {
          key: "priority",
          label: `優先度：${taskPriorityLabels[filterPriority]}`,
          clear: () => setFilterPriority("all"),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  return {
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterSource,
    setFilterSource,
    filterPriority,
    setFilterPriority,
    dialogOpen,
    setDialogOpen,
    addTab,
    setAddTab,
    saving,
    newTitle,
    setNewTitle,
    newDescription,
    setNewDescription,
    newPriority,
    setNewPriority,
    newScope,
    newProjectId,
    newTeamId,
    setNewTeamId,
    newDueDate,
    setNewDueDate,
    newAssignAll,
    newAssigneeIds,
    isLoading,
    tasksError,
    mutate,
    employees,
    projects,
    teams,
    filtered,
    openAddDialog,
    handleAdd,
    handleStatusChange,
    toggleAssignee,
    handleScopeChange,
    handleProjectChange,
    handleAssignAllChange,
    activeFilters,
  };
}
