"use client";

import { useState, useCallback, useMemo } from "react";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/saved-view-repository";
import type {
  CrmEntityType,
  CrmSavedView,
  CrmSavedViewConfig,
  CrmSavedViewFilter,
} from "@/types/database";

/**
 * 保存ビューの管理フック
 */
export function useSavedViews(entityType: CrmEntityType) {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: views, mutate } = useOrgQuery(`crm-saved-views-${entityType}`, (orgId) =>
    repo.fetchSavedViews(getSupabase(), orgId, entityType)
  );

  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const activeView = useMemo(
    () => views?.find((v) => v.id === activeViewId) ?? null,
    [views, activeViewId]
  );

  const saveView = useCallback(
    async (name: string, config: CrmSavedViewConfig, isShared = false) => {
      if (!organization || !user) return;
      try {
        await repo.createSavedView(getSupabase(), {
          organization_id: organization.id,
          user_id: user.id,
          entity_type: entityType,
          name,
          is_shared: isShared,
          config,
        });
        mutate();
      } catch (err) {
        console.error("Failed to save view:", err);
        throw err;
      }
    },
    [organization, user, entityType, mutate]
  );

  const updateView = useCallback(
    async (id: string, data: Partial<Pick<CrmSavedView, "name" | "is_shared" | "config">>) => {
      if (!organization) return;
      try {
        await repo.updateSavedView(getSupabase(), id, organization.id, data);
        mutate();
      } catch (err) {
        console.error("Failed to update view:", err);
        throw err;
      }
    },
    [organization, mutate]
  );

  const deleteView = useCallback(
    async (id: string) => {
      if (!organization) return;
      try {
        await repo.deleteSavedView(getSupabase(), id, organization.id);
        if (activeViewId === id) setActiveViewId(null);
        mutate();
      } catch (err) {
        console.error("Failed to delete view:", err);
        throw err;
      }
    },
    [organization, activeViewId, mutate]
  );

  return {
    views: views ?? [],
    activeView,
    activeViewId,
    setActiveViewId,
    saveView,
    updateView,
    deleteView,
    mutate,
  };
}

/**
 * フィルタ条件をデータに適用するユーティリティ
 */
export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: CrmSavedViewFilter[]
): T[] {
  return data.filter((item) =>
    filters.every((f) => {
      const val = String(item[f.field] ?? "");
      switch (f.operator) {
        case "eq":
          return val === f.value;
        case "neq":
          return val !== f.value;
        case "contains":
          return val.toLowerCase().includes(f.value.toLowerCase());
        case "gt":
          return Number(val) > Number(f.value);
        case "lt":
          return Number(val) < Number(f.value);
        case "gte":
          return Number(val) >= Number(f.value);
        case "lte":
          return Number(val) <= Number(f.value);
        case "empty":
          return !val || val === "null";
        case "not_empty":
          return !!val && val !== "null";
        default:
          return true;
      }
    })
  );
}

/**
 * ソート条件をデータに適用するユーティリティ
 */
export function applySort<T extends Record<string, unknown>>(
  data: T[],
  sort: { field: string; direction: "asc" | "desc" } | undefined
): T[] {
  if (!sort) return data;
  return [...data].sort((a, b) => {
    const aVal = a[sort.field];
    const bVal = b[sort.field];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sort.direction === "asc" ? -1 : 1;
    if (bVal == null) return sort.direction === "asc" ? 1 : -1;
    // 数値比較（両方が数値 or 数値文字列の場合）
    const aNum = typeof aVal === "number" ? aVal : Number(aVal);
    const bNum = typeof bVal === "number" ? bVal : Number(bVal);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sort.direction === "asc" ? aNum - bNum : bNum - aNum;
    }
    const cmp = String(aVal).localeCompare(String(bVal), "ja");
    return sort.direction === "asc" ? cmp : -cmp;
  });
}
