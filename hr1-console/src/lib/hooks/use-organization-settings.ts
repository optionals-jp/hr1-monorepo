"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { loadOrganization, saveOrganization } from "@/lib/hooks/use-settings";
import type { Organization } from "@/types/database";

export function useOrganizationSettings() {
  const { organization, setOrganization } = useOrg();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMission, setEditMission] = useState("");
  const [editEmployeeCount, setEditEmployeeCount] = useState("");
  const [editFoundedYear, setEditFoundedYear] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const data = await loadOrganization(organization.id);
    setOrg(data);
    setLoading(false);
  };

  useEffect(() => {
    if (organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const startEditing = () => {
    if (!org) return;
    setEditName(org.name);
    setEditIndustry(org.industry ?? "");
    setEditLocation(org.location ?? "");
    setEditMission(org.mission ?? "");
    setEditEmployeeCount(org.employee_count ?? "");
    setEditFoundedYear(org.founded_year?.toString() ?? "");
    setEditWebsiteUrl(org.website_url ?? "");
    setEditing(true);
  };

  const saveEdit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!org || !editName.trim()) return { success: false, error: "組織名は必須です" };
    setSaving(true);

    const foundedYear = editFoundedYear ? parseInt(editFoundedYear, 10) : null;

    const { data } = await saveOrganization(org.id, {
      name: editName.trim(),
      industry: editIndustry.trim() || null,
      location: editLocation.trim() || null,
      mission: editMission.trim() || null,
      employee_count: editEmployeeCount.trim() || null,
      founded_year: foundedYear && !isNaN(foundedYear) ? foundedYear : null,
      website_url: editWebsiteUrl.trim() || null,
    });

    if (data) {
      setOrg(data);
      setOrganization(data);
    }

    setSaving(false);
    setEditing(false);
    return { success: true };
  };

  return {
    organization,
    org,
    loading,
    editing,
    setEditing,
    editName,
    setEditName,
    editIndustry,
    setEditIndustry,
    editLocation,
    setEditLocation,
    editMission,
    setEditMission,
    editEmployeeCount,
    setEditEmployeeCount,
    editFoundedYear,
    setEditFoundedYear,
    editWebsiteUrl,
    setEditWebsiteUrl,
    saving,
    startEditing,
    saveEdit,
  };
}
