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
import { validators, validateForm, type ValidationErrors } from "@hr1/shared-ui";
import { fireTrigger } from "@/lib/automation/engine";
import type { BcCompany, BcContact, BcDeal, BcLead } from "@/types/database";

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

export function useCrmCompanyActivities(companyId: string) {
  const { organization } = useOrg();
  return useQuery(
    organization ? `crm-company-activities-${organization.id}-${companyId}` : null,
    () => repository.fetchActivitiesByCompany(getSupabase(), companyId, organization!.id)
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

export function useCrmLeadActivities(leadId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-lead-activities-${organization.id}-${leadId}` : null, () =>
    repository.fetchActivitiesByLead(getSupabase(), leadId, organization!.id)
  );
}

// --- Activity Mutation ---
export function useCreateActivity() {
  const { organization } = useOrg();
  return async (data: {
    activity_type: string;
    title: string;
    description?: string | null;
    deal_id?: string | null;
    lead_id?: string | null;
    company_id?: string | null;
    contact_id?: string | null;
    activity_date: string;
    created_by?: string | null;
  }): Promise<{ success: boolean }> => {
    if (!organization) return { success: false };
    try {
      await repository.createActivity(getSupabase(), {
        ...data,
        organization_id: organization.id,
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  };
}

// --- Deal Contacts ---
export function useCrmDealContacts(dealId: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-deal-contacts-${organization.id}-${dealId}` : null, () =>
    dealContactRepository.fetchDealContacts(getSupabase(), dealId, organization!.id)
  );
}

export function useDealContactMutations() {
  const { organization } = useOrg();
  const client = getSupabase();

  const add = async (data: {
    deal_id: string;
    contact_id: string;
    role: import("@/types/database").DealContactRole;
    is_primary: boolean;
    notes: string | null;
  }): Promise<{ success: boolean }> => {
    if (!organization) return { success: false };
    try {
      await dealContactRepository.addDealContact(client, {
        ...data,
        organization_id: organization.id,
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const remove = async (id: string): Promise<{ success: boolean }> => {
    if (!organization) return { success: false };
    try {
      await dealContactRepository.removeDealContact(client, id, organization.id);
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const setPrimary = async (dealId: string, dcId: string): Promise<{ success: boolean }> => {
    if (!organization) return { success: false };
    try {
      await dealContactRepository.setPrimaryContact(client, dealId, dcId, organization.id);
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const updateRole = async (
    id: string,
    role: import("@/types/database").DealContactRole
  ): Promise<{ success: boolean }> => {
    if (!organization) return { success: false };
    try {
      await dealContactRepository.updateDealContact(client, id, organization.id, { role });
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  return { add, remove, setPrimary, updateRole };
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

// --- Contact Mutations ---
export async function saveContact(params: {
  organizationId: string;
  data: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const { data } = params;
  try {
    const commonFields = {
      last_name: data.last_name as string,
      first_name: (data.first_name as string) || null,
      email: (data.email as string) || null,
      phone: (data.phone as string) || null,
      mobile_phone: (data.mobile_phone as string) || null,
      company_id: (data.company_id as string) || null,
      department: (data.department as string) || null,
      position: (data.position as string) || null,
      notes: (data.notes as string) || null,
    };
    if (data.id) {
      await repository.updateContact(
        client,
        data.id as string,
        params.organizationId,
        commonFields
      );
    } else {
      const created = await repository.createContact(client, {
        organization_id: params.organizationId,
        ...commonFields,
      });
      // 自動化トリガー（非同期、エラーは無視）
      fireTrigger(client, {
        organizationId: params.organizationId,
        triggerType: "contact_created",
        entityType: "contact",
        entityId: created.id,
        entityData: { ...commonFields, id: created.id } as Record<string, unknown>,
      }).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    console.error("saveContact failed:", err);
    return { success: false, error: "保存に失敗しました" };
  }
}

export async function removeContact(
  id: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await repository.deleteContact(getSupabase(), id, organizationId);
    return { success: true };
  } catch (err) {
    console.error("removeContact failed:", err);
    return { success: false, error: "削除に失敗しました" };
  }
}

export function useCrmContactsPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcContact>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: contacts, error, mutate } = useCrmContacts();

  const filtered = (contacts ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const fullName = `${c.last_name}${c.first_name ?? ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.crm_companies?.name.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditData({});
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!organization || saving) return;
    const rules = { last_name: [validators.required("姓")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const result = await saveContact({
        organizationId: organization.id,
        data: editData,
      });
      if (result.success) {
        showToast(editData.id ? "連絡先を更新しました" : "連絡先を登録しました");
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
      const result = await removeContact(editData.id, organization.id);
      if (result.success) {
        showToast("連絡先を削除しました");
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
    contacts,
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
      const companyFields = {
        name: data.name as string,
        name_kana: (data.name_kana as string) || null,
        corporate_number: (data.corporate_number as string) || null,
        phone: (data.phone as string) || null,
        address: (data.address as string) || null,
        website: (data.website as string) || null,
        industry: (data.industry as string) || null,
        notes: (data.notes as string) || null,
      };
      const created = await repository.createCompany(client, {
        organization_id: params.organizationId,
        ...companyFields,
      });
      // 自動化トリガー（非同期、エラーは無視）
      fireTrigger(client, {
        organizationId: params.organizationId,
        triggerType: "company_created",
        entityType: "company",
        entityId: created.id,
        entityData: { ...companyFields, id: created.id } as Record<string, unknown>,
      }).catch(() => {});
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
      stage_id: (data.stage_id as string) || null,
      pipeline_id: (data.pipeline_id as string) || null,
      probability: data.probability != null ? Number(data.probability) : null,
      expected_close_date: (data.expected_close_date as string) || null,
      description: (data.description as string) || null,
      assigned_to: (data.assigned_to as string) || null,
    };
    if (data.id) {
      const previousStatus = data._previousStatus as string | undefined;
      const previousStageId = data._previousStageId as string | undefined;
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
      if (commonFields.stage_id !== previousStageId) {
        fireTrigger(client, { ...entityCtx, triggerType: "deal_stage_changed" }).catch(() => {});
      }
    } else {
      const created = await repository.createDeal(client, {
        ...commonFields,
        organization_id: params.organizationId,
        status: "open",
        probability: commonFields.probability ?? null,
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
    return d.title.toLowerCase().includes(q) || d.crm_companies?.name?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditData({ status: "open" });
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
    mutate,
  };
}

// --- Leads ---
export function useCrmLeads() {
  return useOrgQuery("crm-leads", (orgId) => leadRepository.fetchLeads(getSupabase(), orgId));
}

export function useCrmLead(id: string) {
  const { organization } = useOrg();
  return useQuery(organization ? `crm-lead-${organization.id}-${id}` : null, () =>
    leadRepository.fetchLead(getSupabase(), id, organization!.id)
  );
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
      l.contact_name?.toLowerCase().includes(q) ||
      l.contact_email?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditData({ source: "other", status: "new" });
    setErrors(null);
    setEditOpen(true);
  };

  const handleSave = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!organization || saving) return;
    const rules = { name: [validators.required("企業名")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const client = getSupabase();
    try {
      if (editData.id) {
        const previousStatus = (editData as Record<string, unknown>)._previousStatus as
          | string
          | undefined;
        await leadRepository.updateLead(client, editData.id, organization.id, {
          name: editData.name as string,
          contact_name: editData.contact_name || null,
          contact_email: editData.contact_email || null,
          contact_phone: editData.contact_phone || null,
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
          contact_name: editData.contact_name || null,
          contact_email: editData.contact_email || null,
          contact_phone: editData.contact_phone || null,
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
