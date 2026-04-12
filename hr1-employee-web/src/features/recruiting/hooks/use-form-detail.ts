"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTabParam } from "@hr1/shared-ui";
import { useOrg } from "@/lib/org-context";
import type { CustomForm, FormField } from "@/types/database";
import {
  loadFormDetail,
  saveFormEdit,
  type ResponseRow,
  type EditFieldDraft,
} from "@/features/recruiting/hooks/use-forms";

export type FormDetailTab = "fields" | "responses";

export function useFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useTabParam<FormDetailTab>("fields");

  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState<string>("both");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<EditFieldDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const result = await loadFormDetail(id, organization.id);
    setForm(result.form);
    setFields(result.fields);
    setResponses(result.responses);
    setLoading(false);
  }, [id, organization]);

  useEffect(() => {
    if (!organization) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadData is an async data fetcher
    void loadData();
  }, [loadData, organization]);

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
    setEditFields((prev) => [
      ...prev,
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
    setEditFields((prev) => prev.filter((f) => f.id !== fieldId));
  }

  function updateField(fieldId: string, key: string, value: string | boolean) {
    setEditFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)));
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
    return result;
  }

  return {
    form,
    fields,
    responses,
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
