"use client";

import { getSupabase } from "@/lib/supabase/browser";
import * as settingsRepo from "@/lib/repositories/settings-repository";

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
  data: { organization_id?: string; label: string; sort_order?: number }
) {
  const client = getSupabase();
  if (editingTabId) {
    return settingsRepo.updatePageTab(client, editingTabId, { label: data.label });
  }
  return settingsRepo.createPageTab(
    client,
    data as { organization_id: string; label: string; sort_order: number }
  );
}

export async function removePageTab(tabId: string) {
  return settingsRepo.deletePageTab(getSupabase(), tabId);
}

export async function swapPageTabOrder(aId: string, aOrder: number, bId: string, bOrder: number) {
  const client = getSupabase();
  await Promise.all([
    settingsRepo.updatePageTabSortOrder(client, aId, bOrder),
    settingsRepo.updatePageTabSortOrder(client, bId, aOrder),
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

export async function loadSkillMasters() {
  return settingsRepo.fetchSkillMasters(getSupabase());
}

export async function addSkillMaster(data: {
  organization_id: string;
  name: string;
  category: string | null;
}) {
  return settingsRepo.createSkillMaster(getSupabase(), data);
}

export async function removeSkillMaster(id: string) {
  return settingsRepo.deleteSkillMaster(getSupabase(), id);
}

// --- Certifications ---

export async function loadCertificationMasters() {
  return settingsRepo.fetchCertificationMasters(getSupabase());
}

export async function addCertificationMaster(data: {
  organization_id: string;
  name: string;
  category: string | null;
}) {
  return settingsRepo.createCertificationMaster(getSupabase(), data);
}

export async function removeCertificationMaster(id: string) {
  return settingsRepo.deleteCertificationMaster(getSupabase(), id);
}
