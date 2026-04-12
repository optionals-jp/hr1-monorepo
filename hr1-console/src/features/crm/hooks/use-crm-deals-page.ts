"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchDeals, fetchCompanies, createDeal } from "@/lib/repositories/crm-repository";
import { useDefaultPipeline, getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import type { BcDeal } from "@/types/database";

export type ViewMode = "kanban" | "list";
export type StatusFilter = "all" | "open" | "won" | "lost";

export interface DealFormData {
  title: string;
  company_id: string;
  amount: string;
  stage_id: string;
  probability: string;
  expected_close_date: string;
  assigned_to: string;
  description: string;
}

const emptyForm: DealFormData = {
  title: "",
  company_id: "",
  amount: "",
  stage_id: "",
  probability: "",
  expected_close_date: "",
  assigned_to: "",
  description: "",
};

export function useCrmDealsPage() {
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: defaultPipeline } = useDefaultPipeline();
  const stages = getStagesFromPipeline(defaultPipeline);
  const { data: employees } = useEmployees();

  const { data: deals, mutate: mutateDeals } = useOrgQuery("crm-deals-list", (orgId) =>
    fetchDeals(getSupabase(), orgId)
  );

  const { data: companies } = useOrgQuery("crm-deals-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<DealFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter deals
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    let result = deals;
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.crm_companies?.name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [deals, statusFilter, search]);

  // Open add panel
  const openAdd = useCallback(() => {
    setForm({
      ...emptyForm,
      stage_id: stages[0]?.id ?? "",
    });
    setEditOpen(true);
  }, [stages]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof DealFormData>(field: K, value: DealFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save deal
  const handleSave = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || saving) return { success: false };
    if (!form.title.trim()) {
      return { success: false, error: "商談名は必須です" };
    }

    setSaving(true);
    try {
      await createDeal(getSupabase(), {
        organization_id: organization.id,
        title: form.title.trim(),
        company_id: form.company_id || null,
        amount: form.amount ? Number(form.amount) : null,
        stage_id: form.stage_id || null,
        probability: form.probability ? Number(form.probability) : null,
        expected_close_date: form.expected_close_date || null,
        description: form.description.trim() || null,
        assigned_to: form.assigned_to || null,
        pipeline_id: defaultPipeline?.id ?? null,
        status: "open",
        created_by: user?.id ?? null,
      });
      setEditOpen(false);
      mutateDeals();
      return { success: true };
    } catch {
      return { success: false, error: "商談の作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, defaultPipeline, user, mutateDeals]);

  // Group deals by stage for kanban
  const kanbanColumns = useMemo(() => {
    const openDeals = (deals ?? []).filter((d) => d.status === "open");
    const wonDeals = (deals ?? []).filter((d) => d.status === "won");
    const lostDeals = (deals ?? []).filter((d) => d.status === "lost");

    // Apply search filter to kanban too
    const filterFn = (d: BcDeal) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) || (d.crm_companies?.name ?? "").toLowerCase().includes(q)
      );
    };

    const stageColumns = stages.map((stage) => {
      const stageDeals = openDeals.filter((d) => d.stage_id === stage.id).filter(filterFn);
      return {
        id: stage.id,
        name: stage.name,
        color: stage.color,
        deals: stageDeals,
        totalAmount: stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      };
    });

    const filteredWon = wonDeals.filter(filterFn);
    const filteredLost = lostDeals.filter(filterFn);

    return [
      ...stageColumns,
      {
        id: "__won__",
        name: "受注",
        color: "#22c55e",
        deals: filteredWon,
        totalAmount: filteredWon.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      },
      {
        id: "__lost__",
        name: "失注",
        color: "#ef4444",
        deals: filteredLost,
        totalAmount: filteredLost.reduce((sum, d) => sum + (d.amount ?? 0), 0),
      },
    ];
  }, [deals, stages, search]);

  // Resolve employee name
  const getEmployeeName = useCallback(
    (userId: string | null) => {
      if (!userId || !employees) return "---";
      const emp = employees.find((e) => e.id === userId);
      return emp?.display_name ?? emp?.email ?? "---";
    },
    [employees]
  );

  // Resolve stage name
  const getStageName = useCallback(
    (deal: BcDeal) => {
      if (deal.status === "won") return "受注";
      if (deal.status === "lost") return "失注";
      if (deal.stage_id) {
        const stage = stages.find((s) => s.id === deal.stage_id);
        if (stage) return stage.name;
      }
      return "---";
    },
    [stages]
  );

  const loading = !deals;

  return {
    viewMode,
    setViewMode,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    form,
    updateField,
    saving,
    openAdd,
    filteredDeals,
    kanbanColumns,
    loading,
    handleSave,
    employees,
    companies,
    stages,
    pipeline: defaultPipeline,
    getEmployeeName,
    getStageName,
  };
}
