"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery, useEmployees } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchLeads, createLead } from "@/lib/repositories/crm-repository";
import { formatDate } from "@/features/crm/rules";
import type { BcLead, BcLeadStatus } from "@/types/database";

export type StatusFilter = "all" | BcLeadStatus;

export interface LeadFormData {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  source: string;
  assigned_to: string;
  notes: string;
}

const emptyForm: LeadFormData = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "web",
  assigned_to: "",
  notes: "",
};

export { formatDate };

export function useCrmLeadsPage() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: employees } = useEmployees();

  const { data: leads, mutate } = useOrgQuery("crm-leads", (orgId) =>
    fetchLeads(getSupabase(), orgId)
  );

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<LeadFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.contact_name ?? "").toLowerCase().includes(q) ||
          (l.contact_email ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, statusFilter, search]);

  // Resolve employee name
  const getEmployeeName = useCallback(
    (userId: string | null) => {
      if (!userId || !employees) return "---";
      const emp = employees.find((e) => e.id === userId);
      return emp?.display_name ?? emp?.email ?? "---";
    },
    [employees]
  );

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof LeadFormData>(field: K, value: LeadFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save lead
  const handleSave = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || saving) return { success: false };
    if (!form.name.trim()) {
      return { success: false, error: "企業名は必須です" };
    }

    setSaving(true);
    try {
      await createLead(getSupabase(), {
        organization_id: organization.id,
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        source: (form.source || "web") as BcLead["source"],
        status: "new" as const,
        assigned_to: form.assigned_to || null,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      setEditOpen(false);
      mutate();
      return { success: true };
    } catch {
      return { success: false, error: "リードの作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, mutate]);

  const loading = !leads;

  return {
    employees,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    form,
    saving,
    filteredLeads,
    getEmployeeName,
    openAdd,
    updateField,
    handleSave,
  };
}
