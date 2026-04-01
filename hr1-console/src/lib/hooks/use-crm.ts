"use client";

import { useState } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";
import * as leadRepository from "@/lib/repositories/lead-repository";
import * as dealContactRepository from "@/lib/repositories/deal-contact-repository";
import * as quoteRepository from "@/lib/repositories/quote-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { dealStageProbability } from "@/lib/constants/crm";
import { fireTrigger } from "@/lib/automation/engine";
import type { BcCompany, BcDeal, BcLead } from "@/types/database";

// --- Dashboard ---
export function useCrmDeals() {
  return useOrgQuery("crm-deals", (orgId) => repository.fetchDeals(getSupabase(), orgId));
}

export function useCrmCompanyCount() {
  return useOrgQuery("crm-companies-count", (orgId) =>
    repository.fetchCompanyIds(getSupabase(), orgId)
  );
}

export function useCrmContactCount() {
  return useOrgQuery("crm-contacts-count", (orgId) =>
    repository.fetchContactIds(getSupabase(), orgId)
  );
}

// --- Companies ---
export function useCrmCompanies() {
  return useOrgQuery("crm-companies", (orgId) => repository.fetchCompanies(getSupabase(), orgId));
}

export function useCrmCompany(id: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-company-${organization.id}-${id}` : null, () =>
    repository.fetchCompany(getSupabase(), id, organization!.id)
  );
}

export function useCrmCompanyContacts(companyId: string) {
  const { organization } = useOrg();
  return useQuery(
    organization ? `crm-company-contacts-${organization.id}-${companyId}` : null,
    () => repository.fetchContactsByCompany(getSupabase(), companyId, organization!.id)
  );
}

export function useCrmCompanyDeals(companyId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-company-deals-${organization.id}-${companyId}` : null, () =>
    repository.fetchDealsByCompany(getSupabase(), companyId, organization!.id)
  );
}

// --- Contacts ---
export function useCrmContacts() {
  return useOrgQuery("crm-contacts", (orgId) => repository.fetchContacts(getSupabase(), orgId));
}

export function useCrmContact(id: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-contact-${organization.id}-${id}` : null, () =>
    repository.fetchContact(getSupabase(), id, organization!.id)
  );
}

export function useCrmContactDeals(contactId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-contact-deals-${organization.id}-${contactId}` : null, () =>
    repository.fetchDealsByContact(getSupabase(), contactId, organization!.id)
  );
}

export function useCrmContactActivities(contactId: string) {
  const { organization } = useOrg();
  return useQuery(
    organization ? `crm-contact-activities-${organization.id}-${contactId}` : null,
    () => repository.fetchActivitiesByContact(getSupabase(), contactId, organization!.id)
  );
}

export function useCrmContactCards(contactId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-contact-cards-${organization.id}-${contactId}` : null, () =>
    repository.fetchCardsByContact(getSupabase(), contactId, organization!.id)
  );
}

// --- Deals ---
export function useCrmDealsAll() {
  return useOrgQuery("crm-deals-all", (orgId) => repository.fetchDealsAll(getSupabase(), orgId));
}

export function useCrmDeal(id: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-${organization.id}-${id}` : null, () =>
    repository.fetchDeal(getSupabase(), id, organization!.id)
  );
}

export function useCrmDealActivities(dealId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-activities-${organization.id}-${dealId}` : null, () =>
    repository.fetchActivitiesByDeal(getSupabase(), dealId, organization!.id)
  );
}

export function useCrmDealTodos(dealId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-todos-${organization.id}-${dealId}` : null, () =>
    repository.fetchTodosByDeal(getSupabase(), dealId, organization!.id)
  );
}

// --- Deal Contacts ---
export function useCrmDealContacts(dealId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-contacts-${organization.id}-${dealId}` : null, () =>
    dealContactRepository.fetchDealContacts(getSupabase(), dealId, organization!.id)
  );
}

// --- Quotes ---
export function useCrmQuotes() {
  return useOrgQuery("crm-quotes", (orgId) => quoteRepository.fetchQuotes(getSupabase(), orgId));
}

export function useCrmQuotesByDeal(dealId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-quotes-${organization.id}-${dealId}` : null, () =>
    quoteRepository.fetchQuotesByDeal(getSupabase(), dealId, organization!.id)
  );
}

export function useCrmQuote(id: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-quote-${organization.id}-${id}` : null, () =>
    quoteRepository.fetchQuote(getSupabase(), id, organization!.id)
  );
}

// --- Mutations ---
export async function saveCompany(params: {
  organizationId: string;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const { data } = params;
  try {
    if (data.id) {
      await repository.updateCompany(client, data.id as string, params.organizationId, {
        name: data.name as string,
        name_kana: (data.name_kana as string) || null,
        corporate_number: (data.corporate_number as string) || null,
        phone: (data.phone as string) || null,
        address: (data.address as string) || null,
        website: (data.website as string) || null,
        industry: (data.industry as string) || null,
        notes: (data.notes as string) || null,
      });
    } else {
      await repository.createCompany(client, {
        organization_id: params.organizationId,
        name: data.name as string,
        name_kana: (data.name_kana as string) || null,
        corporate_number: (data.corporate_number as string) || null,
        phone: (data.phone as string) || null,
        address: (data.address as string) || null,
        website: (data.website as string) || null,
        industry: (data.industry as string) || null,
        notes: (data.notes as string) || null,
      });
    }
    return { success: true };
  } catch {
    return { success: false, error: "保存に失敗しました" };
  }
}

export async function removeCompany(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await repository.deleteCompany(getSupabase(), id, organizationId);
    return { success: true };
  } catch {
    return { success: false, error: "削除に失敗しました" };
  }
}

// --- Deal Mutations ---
export async function saveDeal(params: {
  organizationId: string;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const { data } = params;
  try {
    const commonFields = {
      title: data.title as string,
      company_id: (data.company_id as string) || null,
      contact_id: (data.contact_id as string) || null,
      amount: data.amount ? Number(data.amount) : null,
      stage: (data.stage as string) || "initial",
      stage_id: (data.stage_id as string) || null,
      pipeline_id: (data.pipeline_id as string) || null,
      probability: data.probability != null ? Number(data.probability) : null,
      expected_close_date: (data.expected_close_date as string) || null,
      description: (data.description as string) || null,
      assigned_to: (data.assigned_to as string) || null,
    };
    if (data.id) {
      const previousStatus = data._previousStatus as string | undefined;
      const previousStage = data._previousStage as string | undefined;
      await repository.updateDeal(client, data.id as string, params.organizationId, {
        ...commonFields,
        status: (data.status as BcDeal["status"]) || "open",
      });
      // 自動化トリガー（非同期、エラーは無視）
      const dealData = { ...commonFields, id: data.id, status: data.status };
      const entityCtx = {
        organizationId: params.organizationId,
        entityType: "deal" as const,
        entityId: data.id as string,
        entityData: dealData as Record<string, unknown>,
      };
      if (data.status === "won" && previousStatus !== "won") {
        fireTrigger(client, { ...entityCtx, triggerType: "deal_won" }).catch(() => {});
      } else if (data.status === "lost" && previousStatus !== "lost") {
        fireTrigger(client, { ...entityCtx, triggerType: "deal_lost" }).catch(() => {});
      }
      if (commonFields.stage !== previousStage) {
        fireTrigger(client, { ...entityCtx, triggerType: "deal_stage_changed" }).catch(() => {});
      }
    } else {
      const created = await repository.createDeal(client, {
        ...commonFields,
        organization_id: params.organizationId,
        status: "open",
        probability: commonFields.probability ?? dealStageProbability[commonFields.stage] ?? null,
      });
      // 自動化トリガー（非同期）
      fireTrigger(client, {
        organizationId: params.organizationId,
        triggerType: "deal_created",
        entityType: "deal",
        entityId: created.id,
        entityData: { ...commonFields, id: created.id } as Record<string, unknown>,
      }).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    console.error("saveDeal failed:", err);
    return { success: false, error: "保存に失敗しました" };
  }
}

export async function removeDeal(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await repository.deleteDeal(getSupabase(), id, organizationId);
    return { success: true };
  } catch (err) {
    console.error("removeDeal failed:", err);
    return { success: false, error: "削除に失敗しました" };
  }
}

export function useCrmDealsPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcDeal>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: deals, error, mutate } = useCrmDealsAll();

  const filtered = (deals ?? []).filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.bc_companies?.name?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditData({ stage: "initial", status: "open" });
    setErrors(null);
    setEditOpen(true);
  };

  const openEdit = (deal: BcDeal) => {
    setEditData({ ...deal });
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!organization || saving) return;
    const rules = { title: [validators.required("商談名")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const result = await saveDeal({
        organizationId: organization.id,
        data: editData,
      });
      if (result.success) {
        showToast(editData.id ? "商談を更新しました" : "商談を登録しました");
        setEditOpen(false);
        mutate();
      } else {
        showToast(result.error!, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!editData.id || !organization || deleting) return;
    setDeleting(true);
    try {
      const result = await removeDeal(editData.id, organization.id);
      if (result.success) {
        showToast("商談を削除しました");
        setEditOpen(false);
        mutate();
      } else {
        showToast(result.error!, "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    deals,
    error,
    filtered,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  };
}

export function useCrmCompaniesPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcCompany>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: companies, error, mutate } = useCrmCompanies();

  const filtered = (companies ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.name_kana?.toLowerCase().includes(q) ||
      c.corporate_number?.includes(q)
    );
  });

  const openCreate = () => {
    setEditData({});
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!organization || saving) return;
    const rules = { name: [validators.required("企業名")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return { success: false };
    }

    setSaving(true);
    try {
      const result = await saveCompany({
        organizationId: organization.id,
        data: editData,
      });
      if (result.success) {
        showToast(editData.id ? "企業情報を更新しました" : "企業を登録しました");
        setEditOpen(false);
        mutate();
      } else {
        showToast(result.error!, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!editData.id || !organization || deleting) return;
    setDeleting(true);
    try {
      const result = await removeCompany(editData.id, organization.id);
      if (result.success) {
        showToast("企業を削除しました");
        setEditOpen(false);
        mutate();
      } else {
        showToast(result.error!, "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  return {
    search,
    setSearch,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    companies,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
  };
}

// --- Leads ---
export function useCrmLeads() {
  return useOrgQuery("crm-leads", (orgId) => leadRepository.fetchLeads(getSupabase(), orgId));
}

export function useCrmLeadsPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcLead>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: leads, error, mutate } = useCrmLeads();

  const filtered = (leads ?? []).filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.company_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditData({ source: "other", status: "new" });
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!organization || saving) return;
    const rules = { name: [validators.required("名前")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const client = getSupabase();
    try {
      if (editData.id) {
        const previousStatus = editData._previousStatus as string | undefined;
        await leadRepository.updateLead(client, editData.id, organization.id, {
          name: editData.name as string,
          company_name: editData.company_name || null,
          email: editData.email || null,
          phone: editData.phone || null,
          source: editData.source || "other",
          status: editData.status || "new",
          assigned_to: editData.assigned_to || null,
          notes: editData.notes || null,
        });
        // ステータス変更トリガー（非同期）
        if (editData.status && editData.status !== previousStatus) {
          fireTrigger(client, {
            organizationId: organization.id,
            triggerType: "lead_status_changed",
            entityType: "lead",
            entityId: editData.id,
            entityData: editData as Record<string, unknown>,
          }).catch(() => {});
        }
      } else {
        const created = await leadRepository.createLead(client, {
          organization_id: organization.id,
          name: editData.name as string,
          company_name: editData.company_name || null,
          email: editData.email || null,
          phone: editData.phone || null,
          source: editData.source || "other",
          status: editData.status || "new",
          notes: editData.notes || null,
        });
        // 作成トリガー（非同期）
        fireTrigger(client, {
          organizationId: organization.id,
          triggerType: "lead_created",
          entityType: "lead",
          entityId: created.id,
          entityData: { ...editData, id: created.id } as Record<string, unknown>,
        }).catch(() => {});
      }
      showToast(editData.id ? "リードを更新しました" : "リードを登録しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!editData.id || !organization || deleting) return;
    setDeleting(true);
    try {
      await leadRepository.deleteLead(getSupabase(), editData.id, organization.id);
      showToast("リードを削除しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    errors,
    leads,
    error,
    filtered,
    openCreate,
    handleSave,
    handleDelete,
    saving,
    deleting,
    mutate,
  };
}
