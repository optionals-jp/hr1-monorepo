"use client";

import { useState } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import type { BcCompany } from "@/types/database";

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

export function useCrmCompaniesPage() {
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BcCompany>>({});
  const [errors, setErrors] = useState<ValidationErrors | null>(null);

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
    const rules = { name: [validators.required("企業名")] };
    const validationErrors = validateForm(rules, editData);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    const result = await saveCompany({
      organizationId: organization!.id,
      data: editData,
    });
    if (result.success) {
      showToast(editData.id ? "企業情報を更新しました" : "企業を登録しました");
      setEditOpen(false);
      mutate();
    } else {
      showToast(result.error!, "error");
    }
  };

  const handleDelete = async (showToast: (msg: string, type?: "success" | "error") => void) => {
    if (!editData.id) return;
    const result = await removeCompany(editData.id, organization!.id);
    if (result.success) {
      showToast("企業を削除しました");
      setEditOpen(false);
      mutate();
    } else {
      showToast(result.error!, "error");
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
  };
}
