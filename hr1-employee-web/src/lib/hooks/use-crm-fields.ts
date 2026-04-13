"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/crm-field-repository";
import type { CrmEntityType } from "@/types/database";

/**
 * テナントのカスタムフィールド定義を取得
 * entityId を渡すとグローバル + エンティティ固有の両方を取得
 */
export function useCrmFieldDefinitions(entityType?: CrmEntityType, entityId?: string) {
  const key = entityId
    ? `crm-field-defs-${entityType}-${entityId}`
    : entityType
      ? `crm-field-defs-${entityType}`
      : "crm-field-defs-all";
  return useOrgQuery(key, (orgId) =>
    repo.fetchFieldDefinitions(getSupabase(), orgId, entityType, entityId)
  );
}

/**
 * 特定エンティティのカスタムフィールド値を取得
 */
export function useCrmFieldValues(entityId: string, entityType: CrmEntityType) {
  const { organization } = useOrg();
  return useQuery(
    organization ? `crm-field-values-${organization.id}-${entityId}-${entityType}` : null,
    () => repo.fetchFieldValues(getSupabase(), organization!.id, entityId, entityType)
  );
}
