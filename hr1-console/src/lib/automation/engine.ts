import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CrmAutomationRule,
  CrmAutomationCondition,
  CrmAutomationAction,
} from "@/types/database";
import * as automationRepo from "@/lib/repositories/automation-repository";

/**
 * 自動化トリガーのコンテキスト
 * トリガー発火時にエンティティデータと共に渡す
 */
export interface TriggerContext {
  organizationId: string;
  triggerType: string;
  entityType: string;
  entityId: string;
  entityData: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  userId?: string;
}

/**
 * 条件を評価する
 */
function evaluateCondition(
  condition: CrmAutomationCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = data[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case "eq":
      return String(fieldValue) === String(targetValue);
    case "neq":
      return String(fieldValue) !== String(targetValue);
    case "gt":
      return Number(fieldValue) > Number(targetValue);
    case "lt":
      return Number(fieldValue) < Number(targetValue);
    case "gte":
      return Number(fieldValue) >= Number(targetValue);
    case "lte":
      return Number(fieldValue) <= Number(targetValue);
    case "contains":
      return String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(targetValue).toLowerCase());
    case "in":
      if (Array.isArray(targetValue)) {
        return targetValue.includes(String(fieldValue));
      }
      return false;
    default:
      return false;
  }
}

/**
 * すべての条件が満たされるか確認（AND 結合）
 */
function evaluateConditions(
  conditions: CrmAutomationCondition[],
  data: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, data));
}

/**
 * アクションを実行する
 */
async function executeAction(
  client: SupabaseClient,
  action: CrmAutomationAction,
  context: TriggerContext
): Promise<void> {
  const { params } = action;

  switch (action.type) {
    case "create_todo": {
      const dueDate = params.due_days
        ? new Date(Date.now() + Number(params.due_days) * 86400000).toISOString().slice(0, 10)
        : null;
      const { error } = await client.from("bc_todos").insert({
        organization_id: context.organizationId,
        title: String(params.title ?? "自動作成タスク"),
        description: params.description ? String(params.description) : null,
        deal_id: context.entityType === "deal" ? context.entityId : null,
        company_id: context.entityType === "company" ? context.entityId : null,
        contact_id: context.entityType === "contact" ? context.entityId : null,
        due_date: dueDate,
        assigned_to: params.assigned_to ? String(params.assigned_to) : (context.userId ?? null),
        created_by: context.userId ?? null,
      });
      if (error) throw error;
      break;
    }

    case "create_activity": {
      const { error } = await client.from("bc_activities").insert({
        organization_id: context.organizationId,
        activity_type: params.activity_type ?? "memo",
        title: String(params.title ?? "自動記録"),
        description: params.description ? String(params.description) : null,
        deal_id: context.entityType === "deal" ? context.entityId : null,
        company_id: context.entityType === "company" ? context.entityId : null,
        contact_id: context.entityType === "contact" ? context.entityId : null,
        activity_date: new Date().toISOString(),
        created_by: context.userId ?? null,
      });
      if (error) throw error;
      break;
    }

    case "send_notification": {
      if (!context.userId) break;
      const { error } = await client.from("notifications").insert({
        organization_id: context.organizationId,
        user_id: params.notify_user_id ? String(params.notify_user_id) : context.userId,
        title: String(params.title ?? "CRM通知"),
        body: String(params.body ?? ""),
        type: "crm_automation",
      });
      if (error) throw error;
      break;
    }

    case "update_field": {
      const table = getTableForEntityType(context.entityType);
      if (!table || !params.field) break;
      const fieldName = String(params.field);
      const allowed = ALLOWED_UPDATE_FIELDS[context.entityType];
      if (!allowed?.has(fieldName)) {
        throw new Error(
          `Field "${fieldName}" is not allowed for update_field action on ${context.entityType}`
        );
      }
      const { error } = await client
        .from(table)
        .update({ [fieldName]: params.value })
        .eq("id", context.entityId)
        .eq("organization_id", context.organizationId);
      if (error) throw error;
      break;
    }

    case "send_webhook": {
      if (!params.url) break;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        await fetch(String(params.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            trigger: context.triggerType,
            entity_type: context.entityType,
            entity_id: context.entityId,
            data: context.entityData,
            timestamp: new Date().toISOString(),
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }
      break;
    }
  }
}

/**
 * update_field アクションで更新を許可するフィールドのホワイトリスト
 * セキュリティ上、id / organization_id 等のシステムカラムは変更不可
 */
const ALLOWED_UPDATE_FIELDS: Record<string, Set<string>> = {
  deal: new Set([
    "status",
    "stage",
    "stage_id",
    "probability",
    "amount",
    "assigned_to",
    "expected_close_date",
    "title",
    "description",
    "lost_reason",
  ]),
  company: new Set([
    "name",
    "industry",
    "phone",
    "website",
    "address",
    "employee_count",
    "description",
  ]),
  contact: new Set([
    "department",
    "position",
    "phone",
    "email",
    "first_name",
    "last_name",
    "description",
  ]),
  lead: new Set(["status", "source", "assigned_to", "score", "title", "description"]),
};

function getTableForEntityType(entityType: string): string | null {
  switch (entityType) {
    case "deal":
      return "bc_deals";
    case "company":
      return "bc_companies";
    case "contact":
      return "bc_contacts";
    case "lead":
      return "bc_leads";
    default:
      return null;
  }
}

/**
 * トリガーを発火して、マッチするルールを実行する
 */
export async function fireTrigger(client: SupabaseClient, context: TriggerContext): Promise<void> {
  const rules = await automationRepo.fetchActiveRulesByTrigger(
    client,
    context.organizationId,
    context.triggerType
  );

  for (const rule of rules) {
    await executeRule(client, rule, context);
  }
}

/**
 * 単一ルールの実行
 */
async function executeRule(
  client: SupabaseClient,
  rule: CrmAutomationRule,
  context: TriggerContext
): Promise<void> {
  // 条件評価
  if (!evaluateConditions(rule.conditions, context.entityData)) {
    return;
  }

  const executedActions: CrmAutomationAction[] = [];
  let status: "success" | "partial" | "failed" = "success";
  let errorMessage: string | null = null;

  for (const action of rule.actions) {
    try {
      await executeAction(client, action, context);
      executedActions.push(action);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      status = executedActions.length > 0 ? "partial" : "failed";
      break;
    }
  }

  // 実行ログを記録
  await automationRepo.insertLog(client, {
    organization_id: context.organizationId,
    rule_id: rule.id,
    trigger_type: context.triggerType,
    entity_type: context.entityType,
    entity_id: context.entityId,
    actions_executed: executedActions,
    status,
    error_message: errorMessage ?? undefined,
  });
}
