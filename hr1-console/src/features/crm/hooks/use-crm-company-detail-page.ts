"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchCompany,
  updateCompany,
  deleteCompany,
  fetchContactsByCompany,
  fetchDealsByCompany,
  fetchActivitiesByCompany,
} from "@/lib/repositories/crm-repository";
import type { BcCompany } from "@/types/database";

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

function companyToForm(company: BcCompany): CompanyFormData {
  return {
    name: company.name,
    name_kana: company.name_kana ?? "",
    industry: company.industry ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    postal_code: company.postal_code ?? "",
    website: company.website ?? "",
    corporate_number: company.corporate_number ?? "",
    notes: company.notes ?? "",
  };
}

export function useCrmCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  useAuth();

  // Fetch company
  const {
    data: company,
    mutate: mutateCompany,
    isLoading: companyLoading,
  } = useOrgQuery(`crm-company-${id}`, (orgId) => fetchCompany(getSupabase(), id, orgId));

  // Fetch related contacts
  const { data: contacts } = useOrgQuery(`crm-company-contacts-${id}`, (orgId) =>
    fetchContactsByCompany(getSupabase(), id, orgId)
  );

  // Fetch related deals
  const { data: deals } = useOrgQuery(`crm-company-deals-${id}`, (orgId) =>
    fetchDealsByCompany(getSupabase(), id, orgId)
  );

  // Fetch related activities
  const { data: activities } = useOrgQuery(`crm-company-activities-${id}`, (orgId) =>
    fetchActivitiesByCompany(getSupabase(), id, orgId)
  );

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormData>({
    name: "",
    name_kana: "",
    industry: "",
    phone: "",
    address: "",
    postal_code: "",
    website: "",
    corporate_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open edit panel
  const openEdit = useCallback(() => {
    if (!company) return;
    setForm(companyToForm(company));
    setEditOpen(true);
  }, [company]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save company update
  const handleUpdate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !company || saving) return { success: false };
    if (!form.name.trim()) {
      return { success: false, error: "企業名は必須です" };
    }

    setSaving(true);
    try {
      await updateCompany(getSupabase(), company.id, organization.id, {
        name: form.name.trim(),
        name_kana: form.name_kana.trim() || null,
        industry: form.industry.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        website: form.website.trim() || null,
        corporate_number: form.corporate_number.trim() || null,
        notes: form.notes.trim() || null,
      });
      setEditOpen(false);
      mutateCompany();
      return { success: true };
    } catch {
      return { success: false, error: "企業情報の更新に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, company, saving, form, mutateCompany]);

  // Delete company
  const handleDelete = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !company || deleting) return { success: false };

    setDeleting(true);
    try {
      await deleteCompany(getSupabase(), company.id, organization.id);
      setDeleteOpen(false);
      return { success: true };
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
      return { success: false, error: "企業の削除に失敗しました" };
    }
  }, [organization, company, deleting]);

  return {
    id,
    company,
    companyLoading,
    contacts,
    deals,
    activities,
    editOpen,
    setEditOpen,
    form,
    saving,
    deleteOpen,
    setDeleteOpen,
    deleting,
    openEdit,
    updateField,
    handleUpdate,
    handleDelete,
  };
}
