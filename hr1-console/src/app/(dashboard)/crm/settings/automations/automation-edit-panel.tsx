"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditPanel } from "@/components/ui/edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  automationTriggerLabels,
  automationActionLabels,
  automationConditionOperatorLabels,
  activityTypeLabels,
} from "@/lib/constants";
import type {
  CrmAutomationTrigger,
  CrmAutomationCondition,
  CrmAutomationAction,
  CrmAutomationActionType,
  CrmAutomationRule,
} from "@/types/database";
import { Plus, Trash2 } from "lucide-react";

type EditableRule = Partial<CrmAutomationRule>;

interface AutomationEditPanelProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editData: EditableRule;
  setEditData: React.Dispatch<React.SetStateAction<EditableRule>>;
  handleSave: () => void;
  handleDelete: (() => void) | undefined;
  saving: boolean;
  deleting: boolean;
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

export function AutomationEditPanel({
  editOpen,
  setEditOpen,
  editData,
  setEditData,
  handleSave,
  handleDelete,
  saving,
  deleting,
}: AutomationEditPanelProps) {
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
    <EditPanel
      open={editOpen}
      onOpenChange={setEditOpen}
      title={editData.id ? "ルール編集" : "ルール作成"}
      onSave={handleSave}
      saving={saving}
      onDelete={handleDelete}
      deleting={deleting}
      confirmDeleteMessage="このルールを削除しますか？この操作は元に戻せません。"
    >
      <div className="space-y-5">
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeCondition(idx)}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

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
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeAction(idx)}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </Button>
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
  );
}
