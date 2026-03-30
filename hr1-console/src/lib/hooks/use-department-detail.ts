"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as departmentRepository from "@/lib/repositories/department-repository";
import type { Department } from "@/types/database";

export interface DeptMember {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
  birth_date: string | null;
  gender: string | null;
  hire_date: string | null;
}

export function useDepartmentDetail(id: string) {
  const { organization } = useOrg();
  const [department, setDepartment] = useState<Department | null>(null);
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const { department: dept, members: memberList } =
      await departmentRepository.findDetailWithMembers(getSupabase(), id, organization.id);
    setDepartment(dept);
    setMembers(memberList as DeptMember[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const updateName = async (name: string) => {
    if (!department) return;
    await departmentRepository.updateName(getSupabase(), department.id, organization!.id, name);
    await load();
  };

  // Edit panel state
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    if (!department) return;
    setEditName(department.name);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!department || !editName.trim()) return;
    setSaving(true);
    await updateName(editName.trim());
    setEditing(false);
    setSaving(false);
  };

  return {
    organization,
    department,
    members,
    loading,
    load,
    updateName,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    editName,
    setEditName,
    saving,
    startEditing,
    saveEdit,
  };
}
