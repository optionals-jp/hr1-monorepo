"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { loadProfileSettings, saveProfileSettings } from "@/lib/hooks/use-settings";
import type { Department } from "@/types/database";

export function useProfileSettings() {
  const { profile, refreshProfile } = useAuth();
  const { organization } = useOrg();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editName, setEditName] = useState("");
  const [editNameKana, setEditNameKana] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCurrentPostalCode, setEditCurrentPostalCode] = useState("");
  const [editCurrentPrefecture, setEditCurrentPrefecture] = useState("");
  const [editCurrentCity, setEditCurrentCity] = useState("");
  const [editCurrentStreetAddress, setEditCurrentStreetAddress] = useState("");
  const [editCurrentBuilding, setEditCurrentBuilding] = useState("");
  const [editRegisteredPostalCode, setEditRegisteredPostalCode] = useState("");
  const [editRegisteredPrefecture, setEditRegisteredPrefecture] = useState("");
  const [editRegisteredCity, setEditRegisteredCity] = useState("");
  const [editRegisteredStreetAddress, setEditRegisteredStreetAddress] = useState("");
  const [editRegisteredBuilding, setEditRegisteredBuilding] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile || !organization) return;
    setLoading(true);

    const { departments: depts, allDepartments: allDepts } = await loadProfileSettings(
      profile.id,
      organization.id
    );
    setDepartments(depts);
    setAssignedDeptIds(depts.map((d) => d.id));
    setAllDepartments(allDepts);
    setLoading(false);
  };

  useEffect(() => {
    if (profile && organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, organization?.id]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.display_name ?? "");
    setEditNameKana(profile.name_kana ?? "");
    setEditPosition(profile.position ?? "");
    setEditBirthDate(profile.birth_date ?? "");
    setEditGender(profile.gender ?? "");
    setEditHireDate(profile.hire_date ?? "");
    setEditPhone(profile.phone ?? "");
    setEditCurrentPostalCode(profile.current_postal_code ?? "");
    setEditCurrentPrefecture(profile.current_prefecture ?? "");
    setEditCurrentCity(profile.current_city ?? "");
    setEditCurrentStreetAddress(profile.current_street_address ?? "");
    setEditCurrentBuilding(profile.current_building ?? "");
    setEditRegisteredPostalCode(profile.registered_postal_code ?? "");
    setEditRegisteredPrefecture(profile.registered_prefecture ?? "");
    setEditRegisteredCity(profile.registered_city ?? "");
    setEditRegisteredStreetAddress(profile.registered_street_address ?? "");
    setEditRegisteredBuilding(profile.registered_building ?? "");
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);

    await saveProfileSettings(
      profile.id,
      {
        display_name: editName.trim() || null,
        name_kana: editNameKana.trim() || null,
        position: editPosition.trim() || null,
        birth_date: editBirthDate || null,
        gender: editGender || null,
        hire_date: editHireDate || null,
        phone: editPhone.trim() || null,
        current_postal_code: editCurrentPostalCode.trim() || null,
        current_prefecture: editCurrentPrefecture.trim() || null,
        current_city: editCurrentCity.trim() || null,
        current_street_address: editCurrentStreetAddress.trim() || null,
        current_building: editCurrentBuilding.trim() || null,
        registered_postal_code: editRegisteredPostalCode.trim() || null,
        registered_prefecture: editRegisteredPrefecture.trim() || null,
        registered_city: editRegisteredCity.trim() || null,
        registered_street_address: editRegisteredStreetAddress.trim() || null,
        registered_building: editRegisteredBuilding.trim() || null,
      },
      editDeptIds
    );

    setSaving(false);
    setEditing(false);
    await refreshProfile();
    await load();
  };

  const toggleDept = (deptId: string) => {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  return {
    profile,
    departments,
    allDepartments,
    loading,

    // Edit panel
    editing,
    setEditing,
    editTab,
    setEditTab,
    saving,
    startEditing,
    saveEdit,

    // Basic info fields
    editName,
    setEditName,
    editNameKana,
    setEditNameKana,
    editPosition,
    setEditPosition,

    // Personal info fields
    editBirthDate,
    setEditBirthDate,
    editGender,
    setEditGender,
    editHireDate,
    setEditHireDate,
    editPhone,
    setEditPhone,

    // Current address
    editCurrentPostalCode,
    setEditCurrentPostalCode,
    editCurrentPrefecture,
    setEditCurrentPrefecture,
    editCurrentCity,
    setEditCurrentCity,
    editCurrentStreetAddress,
    setEditCurrentStreetAddress,
    editCurrentBuilding,
    setEditCurrentBuilding,

    // Registered address
    editRegisteredPostalCode,
    setEditRegisteredPostalCode,
    editRegisteredPrefecture,
    setEditRegisteredPrefecture,
    editRegisteredCity,
    setEditRegisteredCity,
    editRegisteredStreetAddress,
    setEditRegisteredStreetAddress,
    editRegisteredBuilding,
    setEditRegisteredBuilding,

    // Departments
    editDeptIds,
    toggleDept,
  };
}
