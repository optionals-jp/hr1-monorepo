"use client";

import { useEffect, useState, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as settingsRepo from "@/lib/repositories/settings-repository";
import type { SkillMaster, CertificationMaster } from "@/types/database";

// --- Organization ---

export async function loadOrganization(organizationId: string) {
  return settingsRepo.fetchOrganization(getSupabase(), organizationId);
}

export async function saveOrganization(
  organizationId: string,
  data: {
    name: string;
    industry: string | null;
    location: string | null;
    mission: string | null;
    employee_count: string | null;
    founded_year: number | null;
    website_url: string | null;
  }
) {
  return settingsRepo.updateOrganization(getSupabase(), organizationId, data);
}

// --- Profile ---

export async function loadProfileSettings(profileId: string, organizationId: string) {
  const client = getSupabase();
  const [depts, allDepts] = await Promise.all([
    settingsRepo.fetchProfileDepartments(client, profileId),
    settingsRepo.fetchAllDepartments(client, organizationId),
  ]);
  return { departments: depts, allDepartments: allDepts };
}

export async function saveProfileSettings(
  profileId: string,
  data: Record<string, unknown>,
  departmentIds: string[]
) {
  const client = getSupabase();
  await settingsRepo.updateProfile(client, profileId, data);
  await settingsRepo.replaceEmployeeDepartments(client, profileId, departmentIds);
}

// --- Home Design ---

export async function loadPageTabs(organizationId: string) {
  return settingsRepo.fetchPageTabs(getSupabase(), organizationId);
}

export async function savePageTab(
  editingTabId: string | null,
  organizationId: string,
  data: { organization_id?: string; label: string; sort_order?: number }
) {
  const client = getSupabase();
  if (editingTabId) {
    return settingsRepo.updatePageTab(client, editingTabId, organizationId, {
      label: data.label,
    });
  }
  return settingsRepo.createPageTab(
    client,
    data as { organization_id: string; label: string; sort_order: number }
  );
}

export async function removePageTab(tabId: string, organizationId: string) {
  return settingsRepo.deletePageTab(getSupabase(), tabId, organizationId);
}

export async function swapPageTabOrder(
  organizationId: string,
  aId: string,
  aOrder: number,
  bId: string,
  bOrder: number
) {
  const client = getSupabase();
  await Promise.all([
    settingsRepo.updatePageTabSortOrder(client, aId, organizationId, bOrder),
    settingsRepo.updatePageTabSortOrder(client, bId, organizationId, aOrder),
  ]);
}

export async function savePageSection(
  editingSectionId: string | null,
  data: {
    tab_id?: string;
    type: string;
    title: string;
    content: string | null;
    items: Record<string, string>[] | null;
    sort_order?: number;
  }
) {
  const client = getSupabase();
  if (editingSectionId) {
    return settingsRepo.updatePageSection(client, editingSectionId, {
      type: data.type,
      title: data.title,
      content: data.content,
      items: data.items,
    });
  }
  return settingsRepo.createPageSection(
    client,
    data as {
      tab_id: string;
      type: string;
      title: string;
      content: string | null;
      items: Record<string, string>[] | null;
      sort_order: number;
    }
  );
}

export async function removePageSection(sectionId: string) {
  return settingsRepo.deletePageSection(getSupabase(), sectionId);
}

export async function swapPageSectionOrder(
  aId: string,
  aOrder: number,
  bId: string,
  bOrder: number
) {
  const client = getSupabase();
  await Promise.all([
    settingsRepo.updatePageSectionSortOrder(client, aId, bOrder),
    settingsRepo.updatePageSectionSortOrder(client, bId, aOrder),
  ]);
}

// --- Skills ---

export async function loadSkillMasters(organizationId: string) {
  return settingsRepo.fetchSkillMasters(getSupabase(), organizationId);
}

export async function addSkillMaster(data: {
  organization_id: string;
  name: string;
  category: string | null;
}) {
  return settingsRepo.createSkillMaster(getSupabase(), data);
}

export async function removeSkillMaster(id: string, organizationId: string) {
  return settingsRepo.deleteSkillMaster(getSupabase(), id, organizationId);
}

// --- Certifications ---

export async function loadCertificationMasters(organizationId: string) {
  return settingsRepo.fetchCertificationMasters(getSupabase(), organizationId);
}

export async function addCertificationMaster(data: {
  organization_id: string;
  name: string;
  category: string | null;
}) {
  return settingsRepo.createCertificationMaster(getSupabase(), data);
}

export async function removeCertificationMaster(id: string, organizationId: string) {
  return settingsRepo.deleteCertificationMaster(getSupabase(), id, organizationId);
}

// --- Skill Masters Hook ---

export function useSkillMastersPage() {
  const { organization } = useOrg();
  const [masters, setMasters] = useState<SkillMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const data = await loadSkillMasters(organization.id);
    setMasters(data);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
    if (organization) void load();
  }, [organization, load]);

  const handleAdd = async () => {
    if (!organization || !newName.trim()) return;
    setAdding(true);
    await addSkillMaster({
      organization_id: organization.id,
      name: newName.trim(),
      category: newCategory.trim() || null,
    });
    setNewName("");
    setNewCategory("");
    setAdding(false);
    await load();
  };

  const handleDelete = async (master: SkillMaster) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    await removeSkillMaster(master.id, organization!.id);
    await load();
  };

  return {
    organization,
    masters,
    loading,
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    adding,
    handleAdd,
    handleDelete,
  };
}

// --- Certification Masters Hook ---

export function useCertificationMastersPage() {
  const { organization } = useOrg();
  const [masters, setMasters] = useState<CertificationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const data = await loadCertificationMasters(organization.id);
    setMasters(data);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
    if (organization) void load();
  }, [organization, load]);

  const handleAdd = async () => {
    if (!organization || !newName.trim()) return;
    setAdding(true);
    await addCertificationMaster({
      organization_id: organization.id,
      name: newName.trim(),
      category: newCategory.trim() || null,
    });
    setNewName("");
    setNewCategory("");
    setAdding(false);
    await load();
  };

  const handleDelete = async (master: CertificationMaster) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    await removeCertificationMaster(master.id, organization!.id);
    await load();
  };

  return {
    organization,
    masters,
    loading,
    newName,
    setNewName,
    newCategory,
    setNewCategory,
    adding,
    handleAdd,
    handleDelete,
  };
}
