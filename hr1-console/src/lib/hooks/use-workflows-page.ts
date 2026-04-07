"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useRouter } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as workflowRepo from "@/lib/repositories/workflow-repository";
import { getCurrentUserId } from "@/lib/get-current-user-id";
import { workflowRequestTypeLabels } from "@/lib/constants";
import type {
  WorkflowRequest,
  WorkflowRule,
  WorkflowTemplate,
  WorkflowTemplateField,
} from "@/types/database";

interface Employee {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useWorkflowEmployees() {
  const { organization } = useOrg();
  return useQuery<Employee[]>(organization ? `employees-list-${organization.id}` : null, async () =>
    workflowRepo.fetchEmployees(getSupabase(), organization!.id)
  );
}

export function useWorkflowRequests(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<WorkflowRequest[]>(
    organization && enabled ? `workflow-requests-${organization.id}` : null,
    async () => workflowRepo.fetchRequests(getSupabase(), organization!.id)
  );
}

export function useWorkflowRules(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<WorkflowRule[]>(
    organization && enabled ? `workflow-rules-${organization.id}` : null,
    async () => workflowRepo.fetchRules(getSupabase(), organization!.id)
  );
}

export async function reviewRequest(
  requestId: string,
  organizationId: string,
  status: "approved" | "rejected",
  requestType: string,
  reviewComment: string | null
) {
  const client = getSupabase();
  const userId = await getCurrentUserId();

  if (status === "approved" && requestType === "paid_leave") {
    const { data: result } = await workflowRepo.approveLeaveRequest(
      client,
      requestId,
      userId,
      reviewComment
    );
    if (result?.error) {
      return { error: result.error as string };
    }
  } else {
    await workflowRepo.updateRequestStatus(client, requestId, organizationId, {
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_comment: reviewComment,
      updated_at: new Date().toISOString(),
    });
  }

  return { error: null };
}

export async function sendReviewNotification(params: {
  organizationId: string;
  userId: string;
  status: "approved" | "rejected";
  typeLabel: string;
  reviewComment: string;
}) {
  const client = getSupabase();
  await workflowRepo.insertNotification(client, {
    organization_id: params.organizationId,
    user_id: params.userId,
    type: "general",
    title: params.status === "approved" ? "申請が承認されました" : "申請が却下されました",
    body:
      params.status === "approved"
        ? `${params.typeLabel}の申請が承認されました。`
        : `${params.typeLabel}の申請が却下されました。${params.reviewComment ? `理由: ${params.reviewComment}` : ""}`,
    is_read: false,
    action_url: "/workflow",
  });
}

export async function saveWorkflowSettings(params: {
  organizationId: string;
  rules: WorkflowRule[];
  upserts: {
    organization_id: string;
    request_type: string;
    rule_type: string;
    conditions: Record<string, unknown>;
    is_active: boolean;
  }[];
}) {
  const client = getSupabase();
  for (const upsert of params.upserts) {
    const existing = params.rules.find(
      (r) => r.request_type === upsert.request_type && r.rule_type === upsert.rule_type
    );
    await workflowRepo.upsertRule(client, existing?.id ?? null, upsert);
  }
}

export type TabValue = "requests" | "templates" | "settings";

export function useWorkflowTemplates(enabled: boolean) {
  const { organization } = useOrg();
  return useQuery<WorkflowTemplate[]>(
    organization && enabled ? `workflow-templates-${organization.id}` : null,
    async () => workflowRepo.fetchTemplates(getSupabase(), organization!.id)
  );
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "テキスト",
  number: "数値",
  date: "日付",
  textarea: "テキストエリア",
  select: "選択肢",
};

export { FIELD_TYPE_LABELS };

export interface AutoApproveConfig {
  paid_leave: { is_active: boolean; max_days: number };
  overtime: { is_active: boolean; max_hours: number };
  expense: { is_active: boolean; max_amount: number };
  business_trip: { is_active: boolean };
}

const defaultAutoApproveConfig: AutoApproveConfig = {
  paid_leave: { is_active: false, max_days: 3 },
  overtime: { is_active: false, max_hours: 2 },
  expense: { is_active: false, max_amount: 10000 },
  business_trip: { is_active: false },
};

export function formatRequestSummary(req: WorkflowRequest): string {
  const data = req.request_data ?? {};
  switch (req.request_type) {
    case "paid_leave": {
      const startDate = data.start_date as string | undefined;
      const endDate = data.end_date as string | undefined;
      const days = data.days as number | undefined;
      if (startDate && endDate && startDate !== endDate) {
        return `${new Date(startDate).toLocaleDateString("ja-JP")} 〜 ${new Date(endDate).toLocaleDateString("ja-JP")}（${days ?? 1}日間）`;
      }
      if (startDate) {
        return `${new Date(startDate).toLocaleDateString("ja-JP")}（${days ?? 1}日間）`;
      }
      return `${days ?? 1}日間`;
    }
    case "overtime": {
      const hours = data.hours as number | undefined;
      const date = data.date as string | undefined;
      const parts: string[] = [];
      if (date) parts.push(new Date(date).toLocaleDateString("ja-JP"));
      if (hours) parts.push(`${hours}時間`);
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    case "business_trip": {
      const destination = data.destination as string | undefined;
      const startDate = data.start_date as string | undefined;
      const endDate = data.end_date as string | undefined;
      const parts: string[] = [];
      if (destination) parts.push(destination);
      if (startDate && endDate) {
        parts.push(
          `${new Date(startDate).toLocaleDateString("ja-JP")} 〜 ${new Date(endDate).toLocaleDateString("ja-JP")}`
        );
      } else if (startDate) {
        parts.push(new Date(startDate).toLocaleDateString("ja-JP"));
      }
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    case "expense": {
      const amount = data.amount as number | undefined;
      const description = data.description as string | undefined;
      const parts: string[] = [];
      if (amount) parts.push(`¥${amount.toLocaleString("ja-JP")}`);
      if (description) parts.push(description);
      return parts.length > 0 ? parts.join(" / ") : "-";
    }
    default: {
      // カスタムワークフロー: request_data のキー・値を表示
      const entries = Object.entries(data).filter(([, v]) => v != null && v !== "");
      if (entries.length === 0) return "-";
      return entries.map(([, v]) => String(v)).join(" / ");
    }
  }
}

export function useWorkflowsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useTabParam<TabValue>("requests");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WorkflowRequest | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [autoApproveConfig, setAutoApproveConfig] =
    useState<AutoApproveConfig>(defaultAutoApproveConfig);
  const [notifyAdmins, setNotifyAdmins] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Template editing state
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDescription, setEditTemplateDescription] = useState("");
  const [editTemplateIcon, setEditTemplateIcon] = useState("📝");
  const [editTemplateFields, setEditTemplateFields] = useState<WorkflowTemplateField[]>([]);
  const [editTemplateActive, setEditTemplateActive] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const { data: employees = [] } = useWorkflowEmployees();

  const {
    data: requests = [],
    isLoading: requestsLoading,
    error: requestsError,
    mutate,
  } = useWorkflowRequests(activeTab === "requests");

  const {
    data: rules = [],
    isLoading: rulesLoading,
    mutate: mutateRules,
  } = useWorkflowRules(activeTab === "settings");

  const {
    data: templates = [],
    isLoading: templatesLoading,
    mutate: mutateTemplates,
  } = useWorkflowTemplates(activeTab === "templates" || activeTab === "requests");

  useEffect(() => {
    if (rules.length === 0) return;
    const config = { ...defaultAutoApproveConfig };
    for (const rule of rules) {
      if (rule.rule_type === "auto_approve") {
        const reqType = rule.request_type as keyof AutoApproveConfig;
        if (reqType === "paid_leave") {
          config.paid_leave = {
            is_active: rule.is_active,
            max_days: (rule.conditions?.max_days as number) ?? 3,
          };
        } else if (reqType === "overtime") {
          config.overtime = {
            is_active: rule.is_active,
            max_hours: (rule.conditions?.max_hours as number) ?? 2,
          };
        } else if (reqType === "expense") {
          config.expense = {
            is_active: rule.is_active,
            max_amount: (rule.conditions?.max_amount as number) ?? 10000,
          };
        } else if (reqType === "business_trip") {
          config.business_trip = { is_active: rule.is_active };
        }
      }
      if (rule.rule_type === "notify") {
        setNotifyAdmins(rule.is_active);
      }
    }
    setAutoApproveConfig(config);
  }, [rules]);

  const getEmployee = (userId: string): Employee | undefined =>
    employees.find((e) => e.id === userId);

  const filteredRequests = useMemo(() => {
    let rows = requests;
    if (filterStatus !== "all") {
      rows = rows.filter((r) => r.status === filterStatus);
    }
    if (filterType !== "all") {
      rows = rows.filter((r) => r.request_type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        const emp = employees.find((e) => e.id === r.user_id);
        return (
          (emp?.display_name ?? "").toLowerCase().includes(q) ||
          (emp?.email ?? "").toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [requests, filterStatus, filterType, search, employees]);

  const handleReview = async (
    status: "approved" | "rejected"
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedRequest) return { success: false, error: "申請が選択されていません" };
    setSavingReview(true);
    try {
      const result = await reviewRequest(
        selectedRequest.id,
        organization!.id,
        status,
        selectedRequest.request_type,
        reviewComment || null
      );

      if (result.error) {
        setSavingReview(false);
        return { success: false, error: result.error };
      }

      const typeLabel =
        workflowRequestTypeLabels[selectedRequest.request_type] || selectedRequest.request_type;
      await sendReviewNotification({
        organizationId: organization!.id,
        userId: selectedRequest.user_id,
        status,
        typeLabel,
        reviewComment,
      });

      await mutate();
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewComment("");
      return { success: true };
    } catch {
      return { success: false, error: "処理に失敗しました" };
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveSettings = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };
    setSavingSettings(true);
    try {
      const orgId = organization.id;

      const upserts = [
        {
          organization_id: orgId,
          request_type: "paid_leave",
          rule_type: "auto_approve",
          conditions: { max_days: autoApproveConfig.paid_leave.max_days },
          is_active: autoApproveConfig.paid_leave.is_active,
        },
        {
          organization_id: orgId,
          request_type: "overtime",
          rule_type: "auto_approve",
          conditions: { max_hours: autoApproveConfig.overtime.max_hours },
          is_active: autoApproveConfig.overtime.is_active,
        },
        {
          organization_id: orgId,
          request_type: "expense",
          rule_type: "auto_approve",
          conditions: { max_amount: autoApproveConfig.expense.max_amount },
          is_active: autoApproveConfig.expense.is_active,
        },
        {
          organization_id: orgId,
          request_type: "business_trip",
          rule_type: "auto_approve",
          conditions: {},
          is_active: autoApproveConfig.business_trip.is_active,
        },
        {
          organization_id: orgId,
          request_type: "_all",
          rule_type: "notify",
          conditions: {},
          is_active: notifyAdmins,
        },
      ];

      await saveWorkflowSettings({ organizationId: orgId, rules, upserts });

      await mutateRules();
      return { success: true };
    } catch {
      return { success: false, error: "設定の保存に失敗しました" };
    } finally {
      setSavingSettings(false);
    }
  }, [organization, autoApproveConfig, notifyAdmins, rules, mutateRules]);

  const openReviewDialog = useCallback((req: WorkflowRequest) => {
    setSelectedRequest(req);
    setReviewComment("");
    setReviewDialogOpen(true);
  }, []);

  const handleReviewDialogOpenChange = useCallback((open: boolean) => {
    setReviewDialogOpen(open);
    if (!open) setSelectedRequest(null);
  }, []);

  // Template helpers
  const openAddTemplate = useCallback(() => {
    setEditingTemplate(null);
    setEditTemplateName("");
    setEditTemplateDescription("");
    setEditTemplateIcon("📝");
    setEditTemplateFields([]);
    setEditTemplateActive(true);
    setTemplatePanelOpen(true);
  }, []);

  const openEditTemplate = useCallback((tpl: WorkflowTemplate) => {
    setEditingTemplate(tpl);
    setEditTemplateName(tpl.name);
    setEditTemplateDescription(tpl.description ?? "");
    setEditTemplateIcon(tpl.icon);
    setEditTemplateFields(tpl.fields);
    setEditTemplateActive(tpl.is_active);
    setTemplatePanelOpen(true);
  }, []);

  const addTemplateField = useCallback(() => {
    setEditTemplateFields((prev) => [
      ...prev,
      { key: `field_${Date.now()}`, label: "", type: "text", required: false },
    ]);
  }, []);

  const updateTemplateField = useCallback(
    (index: number, patch: Partial<WorkflowTemplateField>) => {
      setEditTemplateFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    },
    []
  );

  const removeTemplateField = useCallback((index: number) => {
    setEditTemplateFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveTemplate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !editTemplateName.trim()) {
      return { success: false, error: "テンプレート名は必須です" };
    }
    setSavingTemplate(true);
    try {
      const client = getSupabase();
      const payload = {
        name: editTemplateName.trim(),
        description: editTemplateDescription.trim() || null,
        icon: editTemplateIcon,
        fields: editTemplateFields,
        is_active: editTemplateActive,
      };

      if (editingTemplate) {
        await workflowRepo.updateTemplate(client, editingTemplate.id, organization.id, payload);
      } else {
        await workflowRepo.createTemplate(client, {
          ...payload,
          organization_id: organization.id,
          sort_order: templates.length,
        });
      }
      await mutateTemplates();
      setTemplatePanelOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: "保存に失敗しました" };
    } finally {
      setSavingTemplate(false);
    }
  }, [
    organization,
    editingTemplate,
    editTemplateName,
    editTemplateDescription,
    editTemplateIcon,
    editTemplateFields,
    editTemplateActive,
    templates.length,
    mutateTemplates,
  ]);

  const handleDeleteTemplate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!editingTemplate || !organization) return { success: false };
    setDeletingTemplate(true);
    try {
      await workflowRepo.deleteTemplate(getSupabase(), editingTemplate.id, organization.id);
      await mutateTemplates();
      setTemplatePanelOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: "削除に失敗しました" };
    } finally {
      setDeletingTemplate(false);
    }
  }, [editingTemplate, organization, mutateTemplates]);

  // Template name lookup for custom request types
  const getRequestTypeLabel = useCallback(
    (requestType: string): string => {
      if (workflowRequestTypeLabels[requestType]) return workflowRequestTypeLabels[requestType];
      const tpl = templates.find((t) => t.id === requestType);
      return tpl ? `${tpl.icon} ${tpl.name}` : requestType;
    },
    [templates]
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const activeFilterCount = [filterStatus !== "all", filterType !== "all"].filter(Boolean).length;

  const navigateToAttendance = useCallback(() => {
    router.push("/attendance");
  }, [router]);

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    reviewDialogOpen,
    handleReviewDialogOpenChange,
    selectedRequest,
    reviewComment,
    setReviewComment,
    savingReview,
    autoApproveConfig,
    setAutoApproveConfig,
    notifyAdmins,
    setNotifyAdmins,
    savingSettings,
    requestsLoading,
    requestsError,
    rulesLoading,
    filteredRequests,
    pendingCount,
    activeFilterCount,
    getEmployee,
    handleReview,
    handleSaveSettings,
    openReviewDialog,
    navigateToAttendance,
    mutate,

    // Templates
    templates,
    templatesLoading,
    templatePanelOpen,
    setTemplatePanelOpen,
    editingTemplate,
    editTemplateName,
    setEditTemplateName,
    editTemplateDescription,
    setEditTemplateDescription,
    editTemplateIcon,
    setEditTemplateIcon,
    editTemplateFields,
    setEditTemplateFields,
    editTemplateActive,
    setEditTemplateActive,
    savingTemplate,
    deletingTemplate,
    openAddTemplate,
    openEditTemplate,
    addTemplateField,
    updateTemplateField,
    removeTemplateField,
    handleSaveTemplate,
    handleDeleteTemplate,
    getRequestTypeLabel,
  };
}
