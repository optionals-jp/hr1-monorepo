"use client";

import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/crm-field-repository";
import type { CrmEntityType } from "@/types/database";

/**
 * テナントの全カスタムフィールド定義を取得
 */
export function useCrmFieldDefinitions(entityType?: CrmEntityType) {
  const key = entityType ? `crm-field-defs-${entityType}` : "crm-field-defs-all";
  return useOrgQuery(key, (orgId) => repo.fetchFieldDefinitions(getSupabase(), orgId, entityType));
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
