"use client";

import { useState } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as employeeRepository from "@/lib/repositories/employee-repository";
import * as departmentRepository from "@/lib/repositories/department-repository";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import type { Profile } from "@/types/database";

export interface EmployeeWithDepts {
  id: string;
  email: string;
  display_name: string | null;
  name_kana: string | null;
  position: string | null;
  phone: string | null;
  hire_date: string | null;
  birth_date: string | null;
  gender: Profile["gender"];
  current_postal_code: string | null;
  current_prefecture: string | null;
  current_city: string | null;
  current_street_address: string | null;
  current_building: string | null;
  registered_postal_code: string | null;
  registered_prefecture: string | null;
  registered_city: string | null;
  registered_street_address: string | null;
  registered_building: string | null;
  departments: { id: string; name: string }[];
}

export function useEmployeesPage() {
  const { organization } = useOrg();

  const { data: departments = [] } = useOrgQuery("departments", (orgId) =>
    departmentRepository.findByOrg(getSupabase(), orgId)
  );

  const {
    data: employees = [],
    isLoading,
    error: employeesError,
    mutate,
  } = useOrgQuery<EmployeeWithDepts[]>("employees", (orgId) =>
    employeeRepository.findEmployeesWithDepartments(getSupabase(), orgId)
  );

  // 検索・フィルター
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");

  // 追加ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddDialog = () => {
    setNewEmail("");
    setNewName("");
    setNewPosition("");
    setSelectedDeptIds([]);
    setFormErrors({});
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };

    const errors = validateForm(
      {
        email: [validators.required("メールアドレス"), validators.email()],
        name: [validators.maxLength(100, "名前")],
        position: [validators.maxLength(100, "役職")],
      },
      { email: newEmail, name: newName, position: newPosition }
    );
    if (errors) {
      setFormErrors(errors);
      if (errors.email || errors.name || errors.position) setAddTab("basic");
      return { success: false };
    }
    setFormErrors({});
    setSaving(true);

    try {
      await employeeRepository.createEmployee(getSupabase(), {
        email: newEmail,
        display_name: newName || null,
        organization_id: organization.id,
        position: newPosition || null,
        department_ids: selectedDeptIds,
      });
      mutate();
      setDialogOpen(false);
      setSaving(false);
      return { success: true };
    } catch {
      setSaving(false);
      return { success: false, error: "社員の追加に失敗しました" };
    }
  };

  const handleDelete = async (
    emp: EmployeeWithDepts
  ): Promise<{ success: boolean; error?: string }> => {
    if (!organization) return { success: false };
    if (!window.confirm(`${emp.display_name ?? emp.email} を組織から削除しますか？`))
      return { success: false };
    setDeletingId(emp.id);
    try {
      await employeeRepository.deleteEmployee(getSupabase(), {
        userId: emp.id,
        organizationId: organization.id,
        departmentIds: emp.departments.map((d) => d.id),
      });
      mutate();
      setDeletingId(null);
      return { success: true };
    } catch {
      setDeletingId(null);
      return { success: false, error: "削除に失敗しました" };
    }
  };

  const toggleDept = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const updateNewEmail = (value: string) => {
    setNewEmail(value);
    setFormErrors((prev) => ({ ...prev, email: "" }));
  };

  const updateNewName = (value: string) => {
    setNewName(value);
    setFormErrors((prev) => ({ ...prev, name: "" }));
  };

  const updateNewPosition = (value: string) => {
    setNewPosition(value);
    setFormErrors((prev) => ({ ...prev, position: "" }));
  };

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.departments.some((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    const matchesDept =
      filterDeptId === "all" ||
      (filterDeptId === "none"
        ? e.departments.length === 0
        : e.departments.some((d) => d.id === filterDeptId));
    return matchesSearch && matchesDept;
  });

  return {
    departments,
    employees,
    isLoading,
    employeesError,
    mutate,
    organization,
    search,
    setSearch,
    filterDeptId,
    setFilterDeptId,
    dialogOpen,
    setDialogOpen,
    importOpen,
    setImportOpen,
    addTab,
    setAddTab,
    newEmail,
    updateNewEmail,
    newName,
    updateNewName,
    newPosition,
    updateNewPosition,
    selectedDeptIds,
    saving,
    formErrors,
    deletingId,
    openAddDialog,
    handleAdd,
    handleDelete,
    toggleDept,
    filtered,
  };
}
