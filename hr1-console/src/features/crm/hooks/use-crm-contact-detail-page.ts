"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import {
  fetchContact,
  fetchCompanies,
  fetchActivitiesByContact,
  fetchDealsByContact,
  fetchCardsByContact,
  updateContact,
  deleteContact,
} from "@/lib/repositories/crm-repository";
import type { BcContact } from "@/types/database";

export interface ContactFormData {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  company_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  mobile_phone: string;
  notes: string;
}

function toForm(contact: BcContact): ContactFormData {
  return {
    last_name: contact.last_name,
    first_name: contact.first_name ?? "",
    last_name_kana: contact.last_name_kana ?? "",
    first_name_kana: contact.first_name_kana ?? "",
    company_id: contact.company_id ?? "",
    department: contact.department ?? "",
    position: contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mobile_phone: contact.mobile_phone ?? "",
    notes: contact.notes ?? "",
  };
}

export function useCrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();

  // Fetch contact
  const { data: contact, mutate: mutateContact } = useOrgQuery(`crm-contact-${id}`, (orgId) =>
    fetchContact(getSupabase(), id, orgId)
  );

  // Fetch companies for edit dropdown
  const { data: companies } = useOrgQuery("crm-contact-detail-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // Fetch related deals
  const { data: deals } = useOrgQuery(`crm-contact-${id}-deals`, (orgId) =>
    fetchDealsByContact(getSupabase(), id, orgId)
  );

  // Fetch activities
  const { data: activities } = useOrgQuery(`crm-contact-${id}-activities`, (orgId) =>
    fetchActivitiesByContact(getSupabase(), id, orgId)
  );

  // Fetch business cards
  const { data: cards } = useOrgQuery(`crm-contact-${id}-cards`, (orgId) =>
    fetchCardsByContact(getSupabase(), id, orgId)
  );

  // UI state
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    company_id: "",
    department: "",
    position: "",
    email: "",
    phone: "",
    mobile_phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open edit panel
  const openEdit = useCallback(() => {
    if (!contact) return;
    setForm(toForm(contact));
    setEditOpen(true);
  }, [contact]);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save contact
  const handleUpdate = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !contact || saving) return { success: false };
    if (!form.last_name.trim()) {
      return { success: false, error: "姓は必須です" };
    }

    setSaving(true);
    try {
      await updateContact(getSupabase(), id, organization.id, {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim() || null,
        last_name_kana: form.last_name_kana.trim() || null,
        first_name_kana: form.first_name_kana.trim() || null,
        company_id: form.company_id || null,
        department: form.department.trim() || null,
        position: form.position.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile_phone: form.mobile_phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      setEditOpen(false);
      mutateContact();
      return { success: true };
    } catch {
      return { success: false, error: "連絡先の更新に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, contact, saving, form, id, mutateContact]);

  // Delete contact
  const handleDelete = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || deleting) return { success: false };
    setDeleting(true);
    try {
      await deleteContact(getSupabase(), id, organization.id);
      setConfirmOpen(false);
      return { success: true };
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
      return { success: false, error: "連絡先の削除に失敗しました" };
    }
  }, [organization, deleting, id]);

  return {
    id,
    contact,
    companies,
    deals,
    activities,
    cards,
    editOpen,
    setEditOpen,
    form,
    saving,
    confirmOpen,
    setConfirmOpen,
    deleting,
    openEdit,
    updateField,
    handleUpdate,
    handleDelete,
  };
}
