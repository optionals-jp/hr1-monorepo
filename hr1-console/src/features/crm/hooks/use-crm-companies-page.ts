"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchCompanies, createCompany } from "@/lib/repositories/crm-repository";
import { filterBySearch } from "@/features/crm/rules";

export interface CompanyFormData {
  name: string;
  name_kana: string;
  industry: string;
  phone: string;
  address: string;
  postal_code: string;
  website: string;
  corporate_number: string;
  notes: string;
}

const emptyForm: CompanyFormData = {
  name: "",
  name_kana: "",
  industry: "",
  phone: "",
  address: "",
  postal_code: "",
  website: "",
  corporate_number: "",
  notes: "",
};

export function useCrmCompaniesPage() {
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: companies, mutate: mutateCompanies } = useOrgQuery("crm-companies-list", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter companies
  const filteredCompanies = useMemo(
    () =>
      filterBySearch(companies ?? [], search, (c) => [c.name, c.name_kana, c.industry, c.address]),
    [companies, search]
  );

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save company
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
      await createCompany(getSupabase(), {
        organization_id: organization.id,
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        industry: form.industry.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        website: form.website.trim() || null,
        corporate_number: form.corporate_number.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      setEditOpen(false);
      mutateCompanies();
      return { success: true };
    } catch {
      return { success: false, error: "企業の作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, mutateCompanies]);

  const loading = !companies;

  return {
    companies,
    loading,
    search,
    setSearch,
    editOpen,
    setEditOpen,
    form,
    saving,
    filteredCompanies,
    openAdd,
    updateField,
    handleSave,
  };
}
