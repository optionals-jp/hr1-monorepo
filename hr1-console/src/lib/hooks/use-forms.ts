"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/form-repository";
import type { CustomForm, FormField } from "@/types/database";

export function useForms() {
  return useOrgQuery<CustomForm[]>("forms", (orgId) => repo.fetchForms(getSupabase(), orgId));
}

interface FieldDraft {
  tempId: string;
  field_type: string;
  label: string;
  description: string;
  placeholder: string;
  is_required: boolean;
  options: string;
}

export type { FieldDraft };

export function useCreateForm() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { organization } = useOrg();

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("both");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}`,
        field_type: "shortText",
        label: "",
        description: "",
        placeholder: "",
        is_required: false,
        options: "",
      },
    ]);
  }, []);

  const removeField = useCallback((tempId: string) => {
    setFields((prev) => prev.filter((f) => f.tempId !== tempId));
  }, []);

  const updateField = useCallback((tempId: string, field: string, value: string | boolean) => {
    setFields((prev) => prev.map((f) => (f.tempId === tempId ? { ...f, [field]: value } : f)));
  }, []);

  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!organization || !title) return { success: false };
    setSaving(true);

    const result = await createForm(organization.id, {
      title,
      target,
      description,
      fields,
    });

    if (result.success) {
      await mutate(`forms-${organization.id}`);
      router.push("/forms");
      setSaving(false);
      return { success: true };
    } else {
      setSaving(false);
      return { success: false, error: result.error ?? "フォームの作成に失敗しました" };
    }
  }, [organization, title, target, description, fields, mutate, router]);

  const cancel = useCallback(() => {
    router.push("/forms");
  }, [router]);

  return {
    title,
    setTitle,
    target,
    setTarget,
    description,
    setDescription,
    fields,
    saving,
    addField,
    removeField,
    updateField,
    handleSubmit,
    cancel,
  };
}

export async function deleteForm(
  orgId: string,
  form: CustomForm
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const count = await repo.fetchResponseCount(client, form.id);
    if (count > 0) {
      return { success: false, error: `このフォームには${count}件の回答があるため削除できません` };
    }
    await repo.deleteFieldsByForm(client, form.id);
    const { error } = await repo.deleteForm(client, form.id, orgId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false, error: "削除に失敗しました" };
  }
}

export async function createForm(
  orgId: string,
  data: {
    title: string;
    target: string;
    description: string;
    fields: {
      field_type: string;
      label: string;
      description: string;
      placeholder: string;
      is_required: boolean;
      options: string;
    }[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const formId = `form-${Date.now()}`;

    const { error: formError } = await repo.insertForm(client, {
      id: formId,
      organization_id: orgId,
      title: data.title,
      target: data.target,
      description: data.description || null,
    });
    if (formError) throw formError;

    if (data.fields.length > 0) {
      const { error: fieldsError } = await repo.insertFields(
        client,
        data.fields.map((field, index) => ({
          id: `field-${formId}-${index + 1}`,
          form_id: formId,
          type: field.field_type,
          label: field.label,
          description: field.description || null,
          placeholder: field.placeholder || null,
          is_required: field.is_required,
          options:
            field.options && ["radio", "checkbox", "dropdown"].includes(field.field_type)
              ? field.options.split("\n").filter(Boolean)
              : null,
          sort_order: index + 1,
        }))
      );
      if (fieldsError) throw fieldsError;
    }

    return { success: true };
  } catch {
    return { success: false, error: "フォームの作成に失敗しました" };
  }
}

interface ResponseRow {
  applicant_id: string;
  applicant_name: string;
  answers: Record<string, string>;
  created_at: string;
}

export async function loadFormDetail(
  id: string,
  orgId: string
): Promise<{
  form: CustomForm | null;
  fields: FormField[];
  responses: ResponseRow[];
}> {
  const client = getSupabase();

  const [{ data: formData }, fieldsData, { data: responsesData }] = await Promise.all([
    repo.fetchFormById(client, id, orgId),
    repo.fetchFields(client, id),
    repo.fetchResponses(client, id),
  ]);

  const grouped: Record<string, ResponseRow> = {};
  for (const resp of responsesData ?? []) {
    const applicantId = resp.applicant_id as string;
    if (!grouped[applicantId]) {
      grouped[applicantId] = {
        applicant_id: applicantId,
        applicant_name: applicantId,
        answers: {},
        created_at: resp.submitted_at,
      };
    }
    grouped[applicantId].answers[resp.field_id] = Array.isArray(resp.value)
      ? (resp.value as string[]).join(", ")
      : String(resp.value ?? "");
  }

  const applicantIds = Object.keys(grouped);
  if (applicantIds.length > 0) {
    const { data: profilesData } = await repo.fetchProfiles(client, applicantIds);
    for (const p of profilesData ?? []) {
      if (grouped[p.id]) {
        grouped[p.id].applicant_name = p.display_name ?? p.email ?? p.id;
      }
    }
  }

  return {
    form: formData,
    fields: fieldsData,
    responses: Object.values(grouped),
  };
}

export async function saveFormEdit(
  form: CustomForm,
  originalFields: FormField[],
  orgId: string,
  editTitle: string,
  editTarget: string,
  editDescription: string,
  editFields: {
    id: string;
    field_type: string;
    label: string;
    description: string;
    placeholder: string;
    is_required: boolean;
    options: string;
    sort_order: number;
    isNew?: boolean;
  }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const fieldLogs: { detail_action: string; summary: string }[] = [];

    const titleChanged = editTitle !== form.title;
    const targetChanged = editTarget !== (form.target ?? "both");
    const descChanged = editDescription !== (form.description ?? "");

    if (titleChanged || targetChanged || descChanged) {
      await repo.updateForm(client, form.id, orgId, {
        title: editTitle,
        target: editTarget,
        description: editDescription || null,
      });
    }

    const existingIds = originalFields.map((f) => f.id);
    const editIds = editFields.filter((f) => !f.isNew).map((f) => f.id);

    const deletedIds = existingIds.filter((fid) => !editIds.includes(fid));
    if (deletedIds.length > 0) {
      await repo.deleteFields(client, deletedIds);
      const deletedLabels = originalFields
        .filter((f) => deletedIds.includes(f.id))
        .map((f) => f.label)
        .join("\u3001");
      fieldLogs.push({
        detail_action: "field_deleted",
        summary: `\u30D5\u30A3\u30FC\u30EB\u30C9\u300C${deletedLabels}\u300D\u3092\u524A\u9664`,
      });
    }

    const newFields = editFields.filter((f) => f.isNew);
    if (newFields.length > 0) {
      await repo.insertFields(
        client,
        newFields.map((f, i) => ({
          id: `field-${form.id}-${Date.now()}-${i}`,
          form_id: form.id,
          type: f.field_type,
          label: f.label,
          description: f.description || null,
          placeholder: f.placeholder || null,
          is_required: f.is_required,
          options:
            f.options && ["radio", "checkbox", "dropdown"].includes(f.field_type)
              ? f.options.split("\n").filter(Boolean)
              : null,
          sort_order: f.sort_order,
        }))
      );
      const newLabels = newFields.map((f) => f.label).join("\u3001");
      fieldLogs.push({
        detail_action: "field_added",
        summary: `\u30D5\u30A3\u30FC\u30EB\u30C9\u300C${newLabels}\u300D\u3092\u8FFD\u52A0`,
      });
    }

    for (const ef of editFields.filter((f) => !f.isNew && existingIds.includes(f.id))) {
      const original = originalFields.find((f) => f.id === ef.id);
      if (!original) continue;
      const changed =
        ef.label !== original.label ||
        ef.field_type !== original.type ||
        ef.description !== (original.description ?? "") ||
        ef.placeholder !== (original.placeholder ?? "") ||
        ef.is_required !== original.is_required ||
        ef.options !== (original.options?.join("\n") ?? "");

      if (changed) {
        await repo.updateField(client, ef.id, {
          type: ef.field_type,
          label: ef.label,
          description: ef.description || null,
          placeholder: ef.placeholder || null,
          is_required: ef.is_required,
          options:
            ef.options && ["radio", "checkbox", "dropdown"].includes(ef.field_type)
              ? ef.options.split("\n").filter(Boolean)
              : null,
          sort_order: ef.sort_order,
        });
        fieldLogs.push({
          detail_action: "field_updated",
          summary: `\u30D5\u30A3\u30FC\u30EB\u30C9\u300C${ef.label}\u300D\u3092\u5909\u66F4`,
        });
      }
    }

    if (fieldLogs.length > 0) {
      const userId = await repo.getCurrentUserId(client);
      if (!userId) throw new Error("認証ユーザーが取得できません");
      await repo.insertAuditLogs(
        client,
        fieldLogs.map((log) => ({
          organization_id: orgId,
          user_id: userId,
          action: log.detail_action.includes("deleted")
            ? "delete"
            : log.detail_action.includes("added")
              ? "create"
              : "update",
          table_name: "custom_forms",
          record_id: form.id,
          metadata: { summary: log.summary, detail_action: log.detail_action },
          source: "console" as const,
        }))
      );
    }

    return { success: true };
  } catch {
    return { success: false, error: "フォームの更新に失敗しました" };
  }
}
