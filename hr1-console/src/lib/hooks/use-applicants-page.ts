"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase, assertNotUnauthorized } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Profile } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";

export function useApplicantsList() {
  return useOrgQuery<Profile[]>("applicants", (orgId) =>
    applicantRepo.findByOrg(getSupabase(), orgId)
  );
}

export async function addApplicant(params: {
  email: string;
  display_name: string | null;
  organization_id: string;
  hiring_type: string | null;
  graduation_year: number | undefined;
}): Promise<void> {
  const { data, error } = await getSupabase().functions.invoke("create-user", {
    body: {
      email: params.email,
      display_name: params.display_name,
      role: "applicant",
      organization_id: params.organization_id,
      hiring_type: params.hiring_type,
      graduation_year: params.graduation_year,
    },
  });
  if (error) await assertNotUnauthorized(error);
  if (data?.error) throw new Error(data.error);
}

export function useApplicantsPage() {
  const { organization } = useOrg();
  const { data: applicants = [], isLoading, error: applicantsError, mutate } = useApplicantsList();

  const [search, setSearch] = useState("");
  const [filterHiringType, setFilterHiringType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newHiringType, setNewHiringType] = useState<string>("");
  const [newGradYear, setNewGradYear] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const openAddDialog = useCallback(() => {
    setNewEmail("");
    setNewName("");
    setNewHiringType("");
    setNewGradYear("");
    setFormErrors({});
    setAddTab("basic");
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false, error: "組織が見つかりません" };

    const errors = validateForm(
      {
        email: [validators.required("メールアドレス"), validators.email()],
        name: [validators.maxLength(100, "名前")],
      },
      { email: newEmail, name: newName }
    );
    if (errors) {
      setFormErrors(errors);
      if (errors.email) setAddTab("basic");
      return { success: false };
    }
    setFormErrors({});
    setSaving(true);

    try {
      await addApplicant({
        email: newEmail,
        display_name: newName || null,
        organization_id: organization.id,
        hiring_type: newHiringType || null,
        graduation_year:
          newHiringType === "new_grad" && newGradYear ? Number(newGradYear) : undefined,
      });

      setDialogOpen(false);
      mutate();
      return { success: true };
    } catch {
      return { success: false, error: "応募者の追加に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, newEmail, newName, newHiringType, newGradYear, mutate]);

  const handleExport = useCallback(() => {
    return applicants.map((a) => ({
      ...a,
      _name: a.display_name ?? "",
      _hiringType:
        a.hiring_type === "new_grad"
          ? `新卒（${a.graduation_year}年卒）`
          : a.hiring_type === "mid_career"
            ? "中途採用"
            : "",
      _createdAt: a.created_at,
    }));
  }, [applicants]);

  const setNewEmailWithClear = useCallback((value: string) => {
    setNewEmail(value);
    setFormErrors((prev) => ({ ...prev, email: "" }));
  }, []);

  const setNewNameWithClear = useCallback((value: string) => {
    setNewName(value);
    setFormErrors((prev) => ({ ...prev, name: "" }));
  }, []);

  const setNewHiringTypeWithClear = useCallback((v: string) => {
    setNewHiringType(v ?? "");
    if (v !== "new_grad") setNewGradYear("");
  }, []);

  const filtered = useMemo(
    () =>
      applicants.filter((a) => {
        const matchesSearch =
          !search ||
          a.email.toLowerCase().includes(search.toLowerCase()) ||
          a.display_name?.toLowerCase().includes(search.toLowerCase());
        const matchesHiringType =
          filterHiringType === "all" ||
          (filterHiringType === "none" ? !a.hiring_type : a.hiring_type === filterHiringType);
        return matchesSearch && matchesHiringType;
      }),
    [applicants, search, filterHiringType]
  );

  return {
    organization,
    applicants,
    isLoading,
    applicantsError,
    mutate,
    search,
    setSearch,
    filterHiringType,
    setFilterHiringType,
    dialogOpen,
    setDialogOpen,
    importOpen,
    setImportOpen,
    addTab,
    setAddTab,
    newEmail,
    setNewEmail: setNewEmailWithClear,
    newName,
    setNewName: setNewNameWithClear,
    newHiringType,
    setNewHiringType: setNewHiringTypeWithClear,
    newGradYear,
    setNewGradYear,
    saving,
    formErrors,
    openAddDialog,
    handleAdd,
    handleExport,
    filtered,
  };
}
