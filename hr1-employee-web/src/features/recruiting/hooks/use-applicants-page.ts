"use client";

import { useState, useCallback, useMemo } from "react";
import { isWithinJstDateRange } from "@hr1/shared-ui/lib/date-range";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";
import type { Profile } from "@/types/database";
import { useOrg } from "@/lib/org-context";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";

export function useApplicantsList() {
  return useOrgQuery<Profile[]>("applicants", (orgId) =>
    applicantRepo.findByOrg(getSupabase(), orgId)
  );
}

/**
 * 組織内で 1 件以上応募した候補者 ID の Set を取得するクエリフック。
 * 候補者一覧のサマリ（応募済み／未応募）で使用する。
 */
function useApplicantIdsWithApplications() {
  return useOrgQuery<Set<string>>("applicants-with-applications", (orgId) =>
    applicantRepo.fetchApplicantIdsWithApplications(getSupabase(), orgId)
  );
}

/**
 * 候補者一覧画面の上部サマリ（総数・新卒・中途・応募済み・未応募）用の集計結果。
 * タブ・検索・フィルタには影響されず、常に組織内の全候補者を母集団とする。
 */
export interface ApplicantsSummary {
  total: number;
  newGrad: number;
  midCareer: number;
  applied: number;
  notApplied: number;
}

export function useApplicantsPage() {
  const { organization } = useOrg();
  const { data: applicants = [], isLoading, error: applicantsError, mutate } = useApplicantsList();
  const { data: appliedIds = new Set<string>() } = useApplicantIdsWithApplications();

  const [search, setSearch] = useState("");
  const [filterHiringType, setFilterHiringType] = useState<string>("all");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState<string>("");
  const [filterCreatedTo, setFilterCreatedTo] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
      await applicantRepo.createApplicant(getSupabase(), {
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
      return { success: false, error: "候補者の追加に失敗しました" };
    } finally {
      setSaving(false);
    }
  }, [organization, newEmail, newName, newHiringType, newGradYear, mutate]);

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

  /**
   * 画面上部のサマリ（総数・新卒・中途・応募済み・未応募）。
   * タブ・検索・フィルタには連動しない（常に全候補者を母集団とする）。
   */
  const summary = useMemo<ApplicantsSummary>(() => {
    let newGrad = 0;
    let midCareer = 0;
    let applied = 0;
    for (const a of applicants) {
      if (a.hiring_type === "new_grad") newGrad++;
      else if (a.hiring_type === "mid_career") midCareer++;
      if (appliedIds.has(a.id)) applied++;
    }
    return {
      total: applicants.length,
      newGrad,
      midCareer,
      applied,
      notApplied: applicants.length - applied,
    };
  }, [applicants, appliedIds]);

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
        const matchesCreatedRange =
          (!filterCreatedFrom && !filterCreatedTo) ||
          isWithinJstDateRange(a.created_at, filterCreatedFrom, filterCreatedTo);
        return matchesSearch && matchesHiringType && matchesCreatedRange;
      }),
    [applicants, search, filterHiringType, filterCreatedFrom, filterCreatedTo]
  );

  return {
    organization,
    applicants,
    summary,
    isLoading,
    applicantsError,
    mutate,
    search,
    setSearch,
    filterHiringType,
    setFilterHiringType,
    filterCreatedFrom,
    setFilterCreatedFrom,
    filterCreatedTo,
    setFilterCreatedTo,
    dialogOpen,
    setDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
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
    filtered,
  };
}
