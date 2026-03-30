"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as departmentRepository from "@/lib/repositories/department-repository";
import type { Department } from "@/types/database";

interface DeptMember {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
}

export interface DeptWithMembers extends Department {
  members: DeptMember[];
}

export function useDepartmentsPage() {
  const { organization } = useOrg();

  // タブ
  const [activeTab, setActiveTab] = useState("list");

  // 検索
  const [search, setSearch] = useState("");

  // 追加ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("none");
  const [savingAdd, setSavingAdd] = useState(false);

  // 編集ダイアログ
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("none");
  const [savingEdit, setSavingEdit] = useState(false);

  // 組織図パン＆ズーム
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: departments = [],
    isLoading,
    error: departmentsError,
    mutate,
  } = useOrgQuery<Department[]>("departments", (orgId) =>
    departmentRepository.findByOrg(getSupabase(), orgId)
  );

  const {
    data: deptWithMembers = [],
    isLoading: orgLoading,
    mutate: mutateOrg,
  } = useQuery<DeptWithMembers[]>(
    organization && activeTab === "orgchart" ? `dept-members-${organization.id}` : null,
    () => departmentRepository.findWithMembers(getSupabase(), organization!.id)
  );

  // wheelイベントはpassive: falseでネイティブ登録
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(2, z + 0.1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.3, z - 0.1));
  }, []);

  const openAddDialog = () => {
    setNewDeptName("");
    setNewParentId("none");
    setDialogOpen(true);
  };

  const handleAdd = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !newDeptName.trim()) return { success: false };
    setSavingAdd(true);
    try {
      await departmentRepository.create(getSupabase(), {
        organizationId: organization.id,
        name: newDeptName.trim(),
        parentId: newParentId === "none" ? null : newParentId,
      });
      mutate();
      mutateOrg();
      setDialogOpen(false);
      setSavingAdd(false);
      return { success: true };
    } catch {
      setSavingAdd(false);
      return { success: false, error: "部署の追加に失敗しました" };
    }
  };

  const handleDelete = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await departmentRepository.remove(getSupabase(), id, organization!.id);
      mutate();
      mutateOrg();
      return { success: true };
    } catch {
      return { success: false, error: "部署の削除に失敗しました" };
    }
  };

  const startEditing = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditParentId(dept.parent_id ?? "none");
    setEditDialogOpen(true);
  };

  const saveEdit = async (): Promise<{ success: boolean; error?: string }> => {
    if (!editingId || !editName.trim()) return { success: false };
    setSavingEdit(true);
    try {
      await departmentRepository.update(getSupabase(), editingId, organization!.id, {
        name: editName.trim(),
        parent_id: editParentId === "none" ? null : editParentId,
      });
      mutate();
      mutateOrg();
      setEditingId(null);
      setEditDialogOpen(false);
      setSavingEdit(false);
      return { success: true };
    } catch {
      setSavingEdit(false);
      return { success: false, error: "部署の更新に失敗しました" };
    }
  };

  const filtered = departments.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  const getDescendantIds = (deptId: string): Set<string> => {
    const ids = new Set<string>();
    const collect = (id: string) => {
      for (const d of departments) {
        if (d.parent_id === id && !ids.has(d.id)) {
          ids.add(d.id);
          collect(d.id);
        }
      }
    };
    collect(deptId);
    return ids;
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return departments.find((d) => d.id === parentId)?.name ?? null;
  };

  const rootDepts = deptWithMembers.filter((d) => !d.parent_id);
  const orphanDepts = deptWithMembers.filter(
    (d) => d.parent_id && !deptWithMembers.some((p) => p.id === d.parent_id)
  );
  const topLevelDepts = [...rootDepts, ...orphanDepts];

  return {
    departments,
    isLoading,
    departmentsError,
    mutate,
    deptWithMembers,
    orgLoading,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    newDeptName,
    setNewDeptName,
    newParentId,
    setNewParentId,
    savingAdd,
    editDialogOpen,
    setEditDialogOpen,
    editingId,
    editName,
    setEditName,
    editParentId,
    setEditParentId,
    savingEdit,
    zoom,
    pan,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetView,
    zoomIn,
    zoomOut,
    openAddDialog,
    handleAdd,
    handleDelete,
    startEditing,
    saveEdit,
    filtered,
    getDescendantIds,
    getParentName,
    topLevelDepts,
  };
}
