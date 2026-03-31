"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { useTabParam } from "@/lib/hooks/use-tab-param";
import { getSupabase } from "@/lib/supabase/browser";
import * as employeeRepository from "@/lib/repositories/employee-repository";
import * as departmentRepository from "@/lib/repositories/department-repository";
import type { Profile, Department, EmployeeSkill, EmployeeCertification } from "@/types/database";

export interface MembershipRecord {
  id: string;
  role: "leader" | "member";
  joined_at: string;
  left_at: string | null;
  team: { id: string; name: string; project: { id: string; name: string; status: string } };
}

export interface EditForm {
  name: string;
  nameKana: string;
  position: string;
  birthDate: string;
  gender: string;
  hireDate: string;
  phone: string;
  currentPostalCode: string;
  currentPrefecture: string;
  currentCity: string;
  currentStreetAddress: string;
  currentBuilding: string;
  registeredPostalCode: string;
  registeredPrefecture: string;
  registeredCity: string;
  registeredStreetAddress: string;
  registeredBuilding: string;
}

const initialEditForm: EditForm = {
  name: "",
  nameKana: "",
  position: "",
  birthDate: "",
  gender: "",
  hireDate: "",
  phone: "",
  currentPostalCode: "",
  currentPrefecture: "",
  currentCity: "",
  currentStreetAddress: "",
  currentBuilding: "",
  registeredPostalCode: "",
  registeredPrefecture: "",
  registeredCity: "",
  registeredStreetAddress: "",
  registeredBuilding: "",
};

export function useEmployeeDetail(id: string) {
  const { organization } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [certifications, setCertifications] = useState<EmployeeCertification[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useTabParam("profile");
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editForm, setEditForm] = useState<EditForm>(initialEditForm);
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const updateField = (field: keyof EditForm, value: string) =>
    setEditForm((prev) => ({ ...prev, [field]: value }));

  const load = async () => {
    if (!organization) return;
    setLoading(true);

    const membership = await employeeRepository.checkMembership(getSupabase(), id, organization.id);

    if (!membership) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const [profileData, depts] = await Promise.all([
      employeeRepository.findProfile(getSupabase(), id),
      employeeRepository.findEmployeeDepartments(getSupabase(), id),
    ]);

    setProfile(profileData);
    setDepartments(depts as Department[]);
    setAssignedDeptIds(depts.map((d) => d.id));

    const allDepts = await departmentRepository.findByOrg(getSupabase(), organization.id);
    setAllDepartments(allDepts);

    const records = await employeeRepository.findMemberships(getSupabase(), id);
    setMemberships(records);

    const { skills: skillsData, certifications: certsData } =
      await employeeRepository.findSkillsAndCertifications(getSupabase(), id);
    setSkills(skillsData as EmployeeSkill[]);
    setCertifications(certsData as EmployeeCertification[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const startEditing = () => {
    if (!profile) return;
    setEditForm({
      name: profile.display_name ?? "",
      nameKana: profile.name_kana ?? "",
      position: profile.position ?? "",
      birthDate: profile.birth_date ?? "",
      gender: profile.gender ?? "",
      hireDate: profile.hire_date ?? "",
      phone: profile.phone ?? "",
      currentPostalCode: profile.current_postal_code ?? "",
      currentPrefecture: profile.current_prefecture ?? "",
      currentCity: profile.current_city ?? "",
      currentStreetAddress: profile.current_street_address ?? "",
      currentBuilding: profile.current_building ?? "",
      registeredPostalCode: profile.registered_postal_code ?? "",
      registeredPrefecture: profile.registered_prefecture ?? "",
      registeredCity: profile.registered_city ?? "",
      registeredStreetAddress: profile.registered_street_address ?? "",
      registeredBuilding: profile.registered_building ?? "",
    });
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!profile) return { success: false, error: "プロフィールが見つかりません" };
    setSaving(true);

    await employeeRepository.updateProfile(getSupabase(), profile.id, {
      display_name: editForm.name.trim() || null,
      name_kana: editForm.nameKana.trim() || null,
      position: editForm.position.trim() || null,
      birth_date: editForm.birthDate || null,
      gender: editForm.gender || null,
      hire_date: editForm.hireDate || null,
      phone: editForm.phone.trim() || null,
      current_postal_code: editForm.currentPostalCode.trim() || null,
      current_prefecture: editForm.currentPrefecture.trim() || null,
      current_city: editForm.currentCity.trim() || null,
      current_street_address: editForm.currentStreetAddress.trim() || null,
      current_building: editForm.currentBuilding.trim() || null,
      registered_postal_code: editForm.registeredPostalCode.trim() || null,
      registered_prefecture: editForm.registeredPrefecture.trim() || null,
      registered_city: editForm.registeredCity.trim() || null,
      registered_street_address: editForm.registeredStreetAddress.trim() || null,
      registered_building: editForm.registeredBuilding.trim() || null,
    });
    await employeeRepository.replaceEmployeeDepartments(getSupabase(), profile.id, editDeptIds);
    await load();

    setSaving(false);
    setEditing(false);
    return { success: true };
  };

  const toggleDept = (deptId: string) => {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  return {
    organization,
    profile,
    departments,
    assignedDeptIds,
    allDepartments,
    memberships,
    skills,
    certifications,
    loading,
    load,
    saveProfile: saveEdit,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    editTab,
    setEditTab,
    editForm,
    updateField,
    editDeptIds,
    saving,
    startEditing,
    saveEdit,
    toggleDept,
  };
}
