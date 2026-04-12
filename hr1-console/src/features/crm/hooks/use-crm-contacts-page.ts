"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchContacts, fetchCompanies, createContact } from "@/lib/repositories/crm-repository";
import { filterBySearch } from "@/features/crm/rules";

export interface ContactFormData {
  last_name: string;
  first_name: string;
  company_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  mobile_phone: string;
  notes: string;
}

const emptyForm: ContactFormData = {
  last_name: "",
  first_name: "",
  company_id: "",
  department: "",
  position: "",
  email: "",
  phone: "",
  mobile_phone: "",
  notes: "",
};

export function useCrmContactsPage() {
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: contacts, mutate: mutateContacts } = useOrgQuery("crm-contacts-list", (orgId) =>
    fetchContacts(getSupabase(), orgId)
  );

  const { data: companies } = useOrgQuery("crm-contacts-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter contacts
  const filteredContacts = useMemo(
    () =>
      filterBySearch(contacts ?? [], search, (c) => [
        c.last_name,
        c.first_name,
        c.email,
        c.crm_companies?.name,
        c.department,
      ]),
    [contacts, search]
  );

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save contact
  const handleSave = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || saving) return { success: false };
    if (!form.last_name.trim()) {
      return { success: false, error: "姓は必須です" };
    }

    setSaving(true);
    try {
      await createContact(getSupabase(), {
        organization_id: organization.id,
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim() || null,
        company_id: form.company_id || null,
        department: form.department.trim() || null,
        position: form.position.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile_phone: form.mobile_phone.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      setEditOpen(false);
      mutateContacts();
      return { success: true };
    } catch {
      return { success: false, error: "連絡先の作成に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, mutateContacts]);

  const loading = !contacts;

  return {
    contacts,
    companies,
    loading,
    search,
    setSearch,
    editOpen,
    setEditOpen,
    form,
    saving,
    filteredContacts,
    openAdd,
    updateField,
    handleSave,
  };
}
