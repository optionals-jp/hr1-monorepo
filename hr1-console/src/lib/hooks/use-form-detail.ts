"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { useOrg } from "@/lib/org-context";
import type { CustomForm, FormField } from "@/types/database";
import { loadFormDetail, saveFormEdit } from "@/lib/hooks/use-forms";

interface FieldDraft {
  id: string;
  field_type: string;
  label: string;
  description: string;
  placeholder: string;
  is_required: boolean;
  options: string;
  sort_order: number;
  isNew?: boolean;
}

interface ResponseRow {
  applicant_id: string;
  applicant_name: string;
  answers: Record<string, string>;
  created_at: string;
}

export type { FieldDraft, ResponseRow };

export function useFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam("fields");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState<string>("both");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<FieldDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const result = await loadFormDetail(id, organization.id);
    setForm(result.form);
    setFields(result.fields);
    setResponses(result.responses);

    setLoading(false);
  }

  function startEditing() {
    if (!form) return;
    setEditTitle(form.title);
    setEditTarget(form.target ?? "both");
    setEditDescription(form.description ?? "");
    setEditFields(
      fields.map((f) => ({
        id: f.id,
        field_type: f.type,
        label: f.label,
        description: f.description ?? "",
        placeholder: f.placeholder ?? "",
        is_required: f.is_required,
        options: f.options?.join("\n") ?? "",
        sort_order: f.sort_order,
      }))
    );
    setEditTab("basic");
    setEditing(true);
  }

  function addField() {
    const maxOrder = editFields.length > 0 ? Math.max(...editFields.map((f) => f.sort_order)) : 0;
    setEditFields([
      ...editFields,
      {
        id: `new-${Date.now()}`,
        field_type: "shortText",
        label: "",
        description: "",
        placeholder: "",
        is_required: false,
        options: "",
        sort_order: maxOrder + 1,
        isNew: true,
      },
    ]);
  }

  function removeField(fieldId: string) {
    setEditFields(editFields.filter((f) => f.id !== fieldId));
  }

  function updateField(fieldId: string, key: string, value: string | boolean) {
    setEditFields(editFields.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)));
  }

  async function handleSave(): Promise<{ success: boolean; error?: string }> {
    if (!form || !organization) return { success: false, error: "データが不足しています" };
    setSaving(true);

    const result = await saveFormEdit(
      form,
      fields,
      organization.id,
      editTitle,
      editTarget,
      editDescription,
      editFields
    );

    setSaving(false);
    setEditing(false);
    await loadData();
    setAuditRefreshKey((k) => k + 1);
    return result;
  }

  return {
    form,
    fields,
    responses,
    auditRefreshKey,
    loading,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editTarget,
    setEditTarget,
    editDescription,
    setEditDescription,
    editFields,
    saving,
    startEditing,
    addField,
    removeField,
    updateField,
    handleSave,
  };
}
