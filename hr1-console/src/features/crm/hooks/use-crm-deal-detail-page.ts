"use client";

import { useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import {
  fetchDeal,
  updateDeal,
  deleteDeal,
  fetchActivitiesByDeal,
  fetchTodosByDeal,
  createActivity,
  createTodo,
  toggleTodoComplete,
  fetchStageHistory,
} from "@/lib/repositories/crm-repository";
import { getActivityIconType } from "@/features/crm/rules";
import type { BcDeal, BcActivity, BcTodo, CrmDealStageHistory } from "@/types/database";

export type DealDetailTab = "activities" | "todos" | "history";

export function useCrmDealDetailPage(id: string) {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: pipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(pipeline);
  const { data: employees } = useEmployees();

  const { data: deal, mutate: mutateDeal } = useOrgQuery<BcDeal | null>(`crm-deal-${id}`, (orgId) =>
    fetchDeal(getSupabase(), id, orgId)
  );

  const { data: activities, mutate: mutateActivities } = useOrgQuery<BcActivity[]>(
    `crm-deal-activities-${id}`,
    (orgId) => fetchActivitiesByDeal(getSupabase(), id, orgId)
  );

  const { data: todos, mutate: mutateTodos } = useOrgQuery<BcTodo[]>(
    `crm-deal-todos-${id}`,
    (orgId) => fetchTodosByDeal(getSupabase(), id, orgId)
  );

  const { data: stageHistory } = useOrgQuery<CrmDealStageHistory[]>(
    `crm-deal-stage-history-${id}`,
    (orgId) => fetchStageHistory(getSupabase(), orgId, id)
  );

  // Edit deal state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editStageId, setEditStageId] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Add activity state
  const [activityOpen, setActivityOpen] = useState(false);
  const [actType, setActType] = useState("memo");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));

  // Add todo state
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDesc, setTodoDesc] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [todoAssignee, setTodoAssignee] = useState("");

  // Active section tab
  const [activeTab, setActiveTab] = useState<DealDetailTab>("activities");

  const openEdit = () => {
    if (!deal) return;
    setEditTitle(deal.title);
    setEditAmount(deal.amount?.toString() ?? "");
    setEditStageId(deal.stage_id ?? "");
    setEditProbability(deal.probability?.toString() ?? "");
    setEditCloseDate(deal.expected_close_date ?? "");
    setEditAssignedTo(deal.assigned_to ?? "");
    setEditDescription(deal.description ?? "");
    setEditStatus(deal.status);
    setEditOpen(true);
  };

  const handleUpdate = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !deal) return { success: false };
    if (!editTitle.trim()) {
      return { success: false, error: "商談名は必須です" };
    }
    try {
      await updateDeal(getSupabase(), id, organization.id, {
        title: editTitle,
        amount: editAmount ? Number(editAmount) : null,
        stage_id: editStageId || null,
        probability: editProbability ? Number(editProbability) : null,
        expected_close_date: editCloseDate || null,
        assigned_to: editAssignedTo || null,
        description: editDescription || null,
        status: editStatus as BcDeal["status"],
      });
      setEditOpen(false);
      mutateDeal();
      return { success: true };
    } catch {
      return { success: false, error: "更新に失敗しました" };
    }
  };

  const handleDelete = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };
    try {
      await deleteDeal(getSupabase(), id, organization.id);
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    }
  };

  const handleAddActivity = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !actTitle.trim()) return { success: false };
    try {
      await createActivity(getSupabase(), {
        organization_id: organization.id,
        deal_id: id,
        company_id: deal?.company_id ?? null,
        contact_id: deal?.contact_id ?? null,
        activity_type: actType,
        title: actTitle,
        description: actDesc || null,
        activity_date: actDate,
        created_by: user?.id ?? null,
      });
      setActivityOpen(false);
      setActTitle("");
      setActDesc("");
      setActType("memo");
      mutateActivities();
      return { success: true };
    } catch {
      return { success: false, error: "活動の記録に失敗しました" };
    }
  };

  const handleAddTodo = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !todoTitle.trim()) return { success: false };
    try {
      await createTodo(getSupabase(), {
        organization_id: organization.id,
        deal_id: id,
        company_id: deal?.company_id ?? null,
        contact_id: deal?.contact_id ?? null,
        title: todoTitle,
        description: todoDesc || null,
        due_date: todoDueDate || null,
        assigned_to: todoAssignee || user?.id || null,
        created_by: user?.id ?? null,
      });
      setTodoOpen(false);
      setTodoTitle("");
      setTodoDesc("");
      setTodoDueDate("");
      setTodoAssignee("");
      mutateTodos();
      return { success: true };
    } catch {
      return { success: false, error: "TODOの追加に失敗しました" };
    }
  };

  const handleToggleTodo = async (
    todoId: string,
    completed: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };
    try {
      await toggleTodoComplete(getSupabase(), todoId, organization.id, completed);
      mutateTodos();
      return { success: true };
    } catch {
      return { success: false, error: "更新に失敗しました" };
    }
  };

  const currentStageIndex = deal ? stages.findIndex((s) => s.id === deal.stage_id) : -1;

  return {
    // Data
    deal,
    activities,
    todos,
    stageHistory,
    stages,
    employees,
    currentStageIndex,

    // Tab
    activeTab,
    setActiveTab,

    // Edit deal
    editOpen,
    setEditOpen,
    editTitle,
    setEditTitle,
    editAmount,
    setEditAmount,
    editStageId,
    setEditStageId,
    editProbability,
    setEditProbability,
    editCloseDate,
    setEditCloseDate,
    editAssignedTo,
    setEditAssignedTo,
    editDescription,
    setEditDescription,
    editStatus,
    setEditStatus,
    deleteOpen,
    setDeleteOpen,
    openEdit,

    // Activity form
    activityOpen,
    setActivityOpen,
    actType,
    setActType,
    actTitle,
    setActTitle,
    actDesc,
    setActDesc,
    actDate,
    setActDate,

    // Todo form
    todoOpen,
    setTodoOpen,
    todoTitle,
    setTodoTitle,
    todoDesc,
    setTodoDesc,
    todoDueDate,
    setTodoDueDate,
    todoAssignee,
    setTodoAssignee,

    // Handlers
    handleUpdate,
    handleDelete,
    handleAddActivity,
    handleAddTodo,
    handleToggleTodo,

    // Helpers
    getActivityIconType,
  };
}
