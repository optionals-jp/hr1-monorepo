"use client";

import { useAuth } from "@/lib/auth-context";
import type { PermissionAction } from "@/types/database";

export function usePermission() {
  const { profile, hasPermission } = useAuth();

  const isAdmin = profile?.role === "admin";

  const can = (resource: string, action: PermissionAction = "view"): boolean => {
    if (isAdmin) return true;
    return hasPermission(resource, action);
  };

  const canAny = (resource: string): boolean => {
    return (
      can(resource, "view") ||
      can(resource, "create") ||
      can(resource, "edit") ||
      can(resource, "delete")
    );
  };

  return { can, canAny, isAdmin };
}
