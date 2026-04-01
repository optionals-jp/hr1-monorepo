"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutomationRules } from "@/lib/hooks/use-automation";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as automationRepo from "@/lib/repositories/automation-repository";
import {
  automationTriggerLabels,
  automationActionLabels,
  automationConditionOperatorLabels,
  activityTypeLabels,
} from "@/lib/constants/crm";
import type {
  CrmAutomationRule,
  CrmAutomationTrigger,
  CrmAutomationCondition,
  CrmAutomationAction,
  CrmAutomationActionType,
} from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { TableSection } from "@/components/layout/table-section";
import { Plus, Zap, ZapOff, Trash2, ScrollText } from "lucide-react";
import Link from "next/link";

type EditableRule = Partial<CrmAutomationRule>;

export default function AutomationSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: rules, mutate } = useAutomationRules();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<EditableRule>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreate = useCallback(() => {
    setEditData({
      trigger_type: "deal_stage_changed",
      conditions: [],
      actions: [{ type: "create_todo", params: { title: "", due_days: 3 } }],
      is_active: true,
    });
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((rule: CrmAutomationRule) => {
    setEditData({ ...rule });
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!editData.name?.trim()) {
      showToast("ルール名を入力してください", "error");
      return;
    }
    if (!editData.actions?.length) {
      showToast("アクションを1つ以上追加してください", "error");
      return;
    }

    setSaving(true);
    try {
      if (editData.id) {
        await automationRepo.updateRule(getSupabase(), editData.id, organization.id, {
          name: editData.name.trim(),
          description: editData.description || null,
          trigger_type: editData.trigger_type as CrmAutomationTrigger,
          conditions: editData.conditions ?? [],
          actions: editData.actions ?? [],
        });
        showToast("ルールを更新しました");
      } else {
        await automationRepo.createRule(getSupabase(), {
          organization_id: organization.id,
          name: editData.name.trim(),
          description: editData.description || null,
          is_active: editData.is_active ?? true,
          trigger_type: editData.trigger_type as CrmAutomationTrigger,
          conditions: (editData.conditions ?? []) as CrmAutomationCondition[],
          actions: (editData.actions ?? []) as CrmAutomationAction[],
          sort_order: rules?.length ?? 0,
        });
        showToast("ルールを作成しました");
      }
      setEditOpen(false);
      mutate();
    } catch {
      showToast("ルールの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, editData, rules, showToast, mutate]);

  const handleDelete = useCallback(async () => {
    if (!organization || !editData.id || deleting) return;
    setDeleting(true);
    try {
      await automationRepo.deleteRule(getSupabase(), editData.id, organization.id);
      showToast("ルールを削除しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("ルールの削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  }, [organization, editData.id, deleting, showToast, mutate]);

  const handleToggleActive = async (rule: CrmAutomationRule) => {
    if (!organization) return;
    try {
      await automationRepo.toggleRuleActive(
        getSupabase(),
        rule.id,
        organization.id,
        !rule.is_active
      );
      mutate();
      showToast(rule.is_active ? "ルールを無効にしました" : "ルールを有効にしました");
    } catch {
      showToast("ルールの更新に失敗しました", "error");
    }
  };

  // 条件の追加・削除
  const addCondition = () => {
    setEditData((prev) => ({
      ...prev,
      conditions: [
        ...((prev.conditions ?? []) as CrmAutomationCondition[]),
        { field: "", operator: "eq", value: "" },
      ],
    }));
  };

  const removeCondition = (index: number) => {
    setEditData((prev) => ({
      ...prev,
      conditions: ((prev.conditions ?? []) as CrmAutomationCondition[]).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateCondition = (index: number, field: keyof CrmAutomationCondition, value: unknown) => {
    setEditData((prev) => {
      const conditions = [...((prev.conditions ?? []) as CrmAutomationCondition[])];
      conditions[index] = { ...conditions[index], [field]: value };
      return { ...prev, conditions };
    });
  };

  // アクションの追加・削除
  const addAction = () => {
    setEditData((prev) => ({
      ...prev,
      actions: [
        ...((prev.actions ?? []) as CrmAutomationAction[]),
        { type: "create_todo" as CrmAutomationActionType, params: { title: "", due_days: 3 } },
      ],
    }));
  };

  const removeAction = (index: number) => {
    setEditData((prev) => ({
      ...prev,
      actions: ((prev.actions ?? []) as CrmAutomationAction[]).filter((_, i) => i !== index),
    }));
  };

  const updateAction = (index: number, updates: Partial<CrmAutomationAction>) => {
    setEditData((prev) => {
      const actions = [...((prev.actions ?? []) as CrmAutomationAction[])];
      actions[index] = { ...actions[index], ...updates };
      return { ...prev, actions };
    });
  };

  const updateActionParams = (index: number, key: string, value: unknown) => {
    setEditData((prev) => {
      const actions = [...((prev.actions ?? []) as CrmAutomationAction[])];
      actions[index] = {
        ...actions[index],
        params: { ...actions[index].params, [key]: value },
      };
      return { ...prev, actions };
    });
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="自動化ルール"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <div className="flex gap-2">
            <Link href="/crm/settings/automations/logs">
              <Button variant="outline">
                <ScrollText className="size-4 mr-1.5" />
                実行ログ
              </Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              ルール追加
            </Button>
          </div>
        }
      />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>ルール名</TableHead>
              <TableHead>トリガー</TableHead>
              <TableHead>アクション</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={!rules}
              isEmpty={rules?.length === 0}
              emptyMessage="自動化ルールがありません"
            >
              {(rules ?? []).map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer" onClick={() => openEdit(rule)}>
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={rule.is_active ? "text-primary" : "text-muted-foreground"}
                      title={
                        rule.is_active ? "有効（クリックで無効化）" : "無効（クリックで有効化）"
                      }
                    >
                      {rule.is_active ? <Zap className="size-4" /> : <ZapOff className="size-4" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{rule.name}</span>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                        {rule.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {automationTriggerLabels[rule.trigger_type] ?? rule.trigger_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.actions.map((a) => automationActionLabels[a.type] ?? a.type).join("、")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? "secondary" : "default"}>
                      {rule.is_active ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* ルール編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "ルール編集" : "ルール作成"}
        onSave={handleSave}
        saving={saving}
        onDelete={editData.id ? handleDelete : undefined}
        deleting={deleting}
        confirmDeleteMessage="このルールを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-5">
          {/* 基本情報 */}
          <div>
            <Label>ルール名 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              placeholder="例: 高額商談のフォローアップ"
            />
          </div>

          <div>
            <Label>説明</Label>
            <Textarea
              value={editData.description ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="ルールの目的を簡潔に"
            />
          </div>

          {/* トリガー */}
          <div>
            <Label>トリガー *</Label>
            <Select
              value={editData.trigger_type ?? "deal_stage_changed"}
              onValueChange={(v) =>
                setEditData((p) => ({ ...p, trigger_type: v as CrmAutomationTrigger }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(automationTriggerLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 条件 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">条件（すべて満たす場合に実行）</Label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="size-3 mr-1" />
                条件追加
              </Button>
            </div>
            {((editData.conditions ?? []) as CrmAutomationCondition[]).length === 0 && (
              <p className="text-xs text-muted-foreground">条件なし（常に実行）</p>
            )}
            <div className="space-y-2">
              {((editData.conditions ?? []) as CrmAutomationCondition[]).map((cond, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, "field", e.target.value)}
                    placeholder="フィールド名"
                    className="flex-1"
                  />
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(idx, "operator", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(automationConditionOperatorLabels).map(([val, lbl]) => (
                        <SelectItem key={val} value={val}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={String(cond.value)}
                    onChange={(e) => updateCondition(idx, "value", e.target.value)}
                    placeholder="値"
                    className="flex-1"
                  />
                  <button
                    onClick={() => removeCondition(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* アクション */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">アクション *</Label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="size-3 mr-1" />
                アクション追加
              </Button>
            </div>
            <div className="space-y-3">
              {((editData.actions ?? []) as CrmAutomationAction[]).map((action, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={action.type}
                      onValueChange={(v) => {
                        const defaultParams = getDefaultParams(v as CrmAutomationActionType);
                        updateAction(idx, {
                          type: v as CrmAutomationActionType,
                          params: defaultParams,
                        });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(automationActionLabels).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeAction(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <ActionParamsEditor
                    action={action}
                    onUpdateParam={(key, value) => updateActionParams(idx, key, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}

function getDefaultParams(type: CrmAutomationActionType): Record<string, unknown> {
  switch (type) {
    case "create_todo":
      return { title: "", due_days: 3 };
    case "create_activity":
      return { title: "", activity_type: "memo" };
    case "send_notification":
      return { title: "", body: "" };
    case "update_field":
      return { field: "", value: "" };
    case "send_webhook":
      return { url: "" };
    default:
      return {};
  }
}

function ActionParamsEditor({
  action,
  onUpdateParam,
}: {
  action: CrmAutomationAction;
  onUpdateParam: (key: string, value: unknown) => void;
}) {
  switch (action.type) {
    case "create_todo":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">タスクタイトル</Label>
            <Input
              value={String(action.params.title ?? "")}
              onChange={(e) => onUpdateParam("title", e.target.value)}
              placeholder="例: フォローアップ電話"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">期限（日後）</Label>
            <Input
              type="number"
              value={Number(action.params.due_days ?? 3)}
              onChange={(e) => onUpdateParam("due_days", Number(e.target.value))}
              min={0}
              className="h-8 w-20"
            />
          </div>
          <div>
            <Label className="text-xs">説明</Label>
            <Input
              value={String(action.params.description ?? "")}
              onChange={(e) => onUpdateParam("description", e.target.value)}
              placeholder="タスクの詳細"
              className="h-8"
            />
          </div>
        </div>
      );

    case "create_activity":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">活動タイトル</Label>
            <Input
              value={String(action.params.title ?? "")}
              onChange={(e) => onUpdateParam("title", e.target.value)}
              placeholder="例: ステージ変更記録"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">活動種別</Label>
            <Select
              value={String(action.params.activity_type ?? "memo")}
              onValueChange={(v) => onUpdateParam("activity_type", v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "send_notification":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">通知タイトル</Label>
            <Input
              value={String(action.params.title ?? "")}
              onChange={(e) => onUpdateParam("title", e.target.value)}
              placeholder="例: 高額商談のお知らせ"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">通知内容</Label>
            <Input
              value={String(action.params.body ?? "")}
              onChange={(e) => onUpdateParam("body", e.target.value)}
              placeholder="通知の本文"
              className="h-8"
            />
          </div>
        </div>
      );

    case "update_field":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">フィールド名</Label>
            <Input
              value={String(action.params.field ?? "")}
              onChange={(e) => onUpdateParam("field", e.target.value)}
              placeholder="例: status"
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs">値</Label>
            <Input
              value={String(action.params.value ?? "")}
              onChange={(e) => onUpdateParam("value", e.target.value)}
              placeholder="設定する値"
              className="h-8"
            />
          </div>
        </div>
      );

    case "send_webhook":
      return (
        <div>
          <Label className="text-xs">Webhook URL</Label>
          <Input
            value={String(action.params.url ?? "")}
            onChange={(e) => onUpdateParam("url", e.target.value)}
            placeholder="https://example.com/webhook"
            className="h-8"
          />
        </div>
      );

    default:
      return null;
  }
}
