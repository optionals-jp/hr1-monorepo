"use client";

import { useEffect, useState, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/permission-group-repository";
import type { PermissionGroup, PermissionAction } from "@/types/database";
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from "@/lib/constants/permissions";

export type EditPermissionMap = Record<string, Set<PermissionAction>>;

export function usePermissionGroupsPage() {
  const { organization } = useOrg();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPermissions, setEditPermissions] = useState<EditPermissionMap>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    const data = await repo.findGroups(getSupabase(), organization.id);
    setGroups(data);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    if (organization)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load is an async data fetcher
      void load();
  }, [organization, load]);

  const startCreate = () => {
    setEditingGroup(null);
    setEditName("");
    setEditDescription("");
    setEditPermissions({});
    setEditing(true);
  };

  const startEdit = async (group: PermissionGroup) => {
    const perms = await repo.findPermissionsByGroup(getSupabase(), group.id);
    const map: EditPermissionMap = {};
    for (const p of perms) {
      map[p.resource] = new Set(p.actions);
    }
    setEditingGroup(group);
    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditPermissions(map);
    setEditing(true);
  };

  const togglePermission = (resource: string, action: PermissionAction) => {
    setEditPermissions((prev) => {
      const next = { ...prev };
      const actions = new Set(next[resource] ?? []);
      if (actions.has(action)) {
        actions.delete(action);
      } else {
        actions.add(action);
      }
      if (actions.size === 0) {
        delete next[resource];
      } else {
        next[resource] = actions;
      }
      return next;
    });
  };

  const toggleResourceAll = (resource: string) => {
    setEditPermissions((prev) => {
      const next = { ...prev };
      const current = next[resource];
      if (current && current.size === PERMISSION_ACTIONS.length) {
        delete next[resource];
      } else {
        next[resource] = new Set(PERMISSION_ACTIONS);
      }
      return next;
    });
  };

  const toggleCategoryAll = (category: string) => {
    const categoryResources = PERMISSION_RESOURCES.filter((r) => r.category === category);
    setEditPermissions((prev) => {
      const next = { ...prev };
      const allFull = categoryResources.every(
        (r) => next[r.key] && next[r.key].size === PERMISSION_ACTIONS.length
      );
      for (const r of categoryResources) {
        if (allFull) {
          delete next[r.key];
        } else {
          next[r.key] = new Set(PERMISSION_ACTIONS);
        }
      }
      return next;
    });
  };

  const handleSave = async (): Promise<{ success: boolean; error?: string }> => {
    if (!organization || !editName.trim()) return { success: false, error: "グループ名は必須です" };
    setSaving(true);
    try {
      let groupId: string;
      if (editingGroup) {
        await repo.updateGroup(getSupabase(), editingGroup.id, {
          name: editName.trim(),
          description: editDescription.trim() || null,
        });
        groupId = editingGroup.id;
      } else {
        const created = await repo.createGroup(getSupabase(), {
          organization_id: organization.id,
          name: editName.trim(),
          description: editDescription.trim() || null,
        });
        groupId = created.id;
      }

      const permissions = Object.entries(editPermissions)
        .filter(([, actions]) => actions.size > 0)
        .map(([resource, actions]) => ({
          resource,
          actions: Array.from(actions) as PermissionAction[],
        }));
      await repo.replacePermissions(getSupabase(), groupId, permissions);

      setSaving(false);
      setEditing(false);
      await load();
      return { success: true };
    } catch (e) {
      setSaving(false);
      return { success: false, error: (e as Error).message };
    }
  };

  const handleDelete = async (): Promise<{ success: boolean; error?: string }> => {
    if (!editingGroup) return { success: false };
    try {
      await repo.deleteGroup(getSupabase(), editingGroup.id);
      setEditing(false);
      await load();
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  };

  return {
    groups,
    loading,
    editing,
    setEditing,
    editingGroup,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editPermissions,
    togglePermission,
    toggleResourceAll,
    toggleCategoryAll,
    saving,
    startCreate,
    startEdit,
    handleSave,
    handleDelete,
  };
}
