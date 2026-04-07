"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { getSupabase } from "@/lib/supabase/browser";
import * as settingsRepo from "@/lib/repositories/settings-repository";
import type { SkillMaster } from "@/types/database";
import type { SkillMasterEmployee } from "@/lib/repositories/settings-repository";

const LEVEL_LABELS: Record<number, string> = {
  1: "初心者",
  2: "初級",
  3: "中級",
  4: "上級",
  5: "エキスパート",
};

export { LEVEL_LABELS };

export function useSkillMasterDetail(skillMasterId: string) {
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useTabParam("overview");
  const [master, setMaster] = useState<SkillMaster | null>(null);
  const [employees, setEmployees] = useState<SkillMasterEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const [masterData, employeesData] = await Promise.all([
      settingsRepo.fetchSkillMaster(getSupabase(), skillMasterId),
      settingsRepo.fetchSkillMasterEmployees(getSupabase(), skillMasterId, organization.id),
    ]);
    setMaster(masterData);
    setEmployees(employeesData);
    setLoading(false);
  }, [organization, skillMasterId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
    if (organization) void load();
  }, [organization, load]);

  const stats = useMemo(() => {
    if (employees.length === 0) {
      return { count: 0, average: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const total = employees.reduce((sum, e) => sum + e.level, 0);
    const distribution = [0, 0, 0, 0, 0];
    for (const e of employees) {
      distribution[e.level - 1]++;
    }
    return {
      count: employees.length,
      average: Math.round((total / employees.length) * 10) / 10,
      distribution,
    };
  }, [employees]);

  const startEditDescription = () => {
    setDraftDescription(master?.description ?? "");
    setEditingDescription(true);
  };

  const saveDescription = async () => {
    setSavingDescription(true);
    await settingsRepo.updateSkillMasterDescription(
      getSupabase(),
      skillMasterId,
      draftDescription.trim() || null
    );
    setEditingDescription(false);
    setSavingDescription(false);
    await load();
  };

  return {
    organization,
    master,
    employees,
    loading,
    activeTab,
    setActiveTab,
    stats,
    editingDescription,
    setEditingDescription,
    draftDescription,
    setDraftDescription,
    savingDescription,
    startEditDescription,
    saveDescription,
  };
}
