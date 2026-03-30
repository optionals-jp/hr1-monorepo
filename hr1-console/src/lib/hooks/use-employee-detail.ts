"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
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

  const saveProfile = async (data: Record<string, unknown>, editDeptIds: string[]) => {
    if (!profile) return;
    await employeeRepository.updateProfile(getSupabase(), profile.id, data);
    await employeeRepository.replaceEmployeeDepartments(getSupabase(), profile.id, editDeptIds);
    await load();
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
    saveProfile,
  };
}
