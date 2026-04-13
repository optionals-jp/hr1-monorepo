"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@hr1/shared-ui/components/ui/select";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCrmFieldDefinitions, useCrmFieldValues } from "@/lib/hooks/use-crm-fields";
import {
  createFieldDefinition,
  upsertFieldValues,
  deleteFieldDefinition,
} from "@/lib/repositories/crm-field-repository";
import { getSupabase } from "@/lib/supabase/browser";
import { crmFieldTypeLabels } from "@/lib/constants";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CrmEntityType, CrmFieldDefinition, CrmFieldType } from "@/types/database";

interface CrmCustomFieldsProps {
  entityId: string;
  entityType: CrmEntityType;
}

/**
 * 基本情報 SectionCard 内に埋め込むカスタムフィールド表示。
 * - グローバル定義（全エンティティ共通）+ エンティティ固有定義を表示
 * - 値編集ダイアログ
 * - エンティティ固有フィールド追加ダイアログ
 */
export function CrmCustomFields({ entityId, entityType }: CrmCustomFieldsProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const { data: fieldDefs, mutate: mutateDefs } = useCrmFieldDefinitions(entityType, entityId);
  const { data: fieldValues, mutate: mutateValues } = useCrmFieldValues(entityId, entityType);

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- 値の管理 ---
  const initialValues = useMemo(() => {
    const map: Record<string, string> = {};
    if (fieldValues) {
      for (const fv of fieldValues) {
        map[fv.field_id] = fv.value ?? "";
      }
    }
    return map;
  }, [fieldValues]);

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const localValues = useMemo(
    () => ({ ...initialValues, ...overrides }),
    [initialValues, overrides]
  );

  const handleChange = useCallback((fieldId: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleOpenEdit = useCallback(() => {
    setOverrides({});
    setEditOpen(true);
  }, []);

  const handleSaveValues = useCallback(async () => {
    if (!organization || !fieldDefs) return;
    const missingFields = fieldDefs.filter((fd) => {
      if (!fd.is_required) return false;
      return (localValues[fd.id] ?? "").trim() === "";
    });
    if (missingFields.length > 0) {
      showToast(`必須項目が未入力です: ${missingFields.map((fd) => fd.label).join("、")}`, "error");
      return;
    }
    setSaving(true);
    try {
      await upsertFieldValues(
        getSupabase(),
        fieldDefs.map((fd) => ({
          organization_id: organization.id,
          field_id: fd.id,
          entity_id: entityId,
          entity_type: entityType,
          value: localValues[fd.id] ?? null,
        }))
      );
      mutateValues();
      setEditOpen(false);
      setOverrides({});
      showToast("保存しました");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, fieldDefs, entityId, entityType, localValues, mutateValues, showToast]);

  // --- フィールド追加 ---
  const [newLabel, setNewLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CrmFieldType>("text");
  const [newValue, setNewValue] = useState("");

  const handleOpenAdd = () => {
    setNewLabel("");
    setNewFieldType("text");
    setNewValue("");
    setAddOpen(true);
  };

  const handleAddField = async () => {
    if (!organization || !newLabel.trim()) return;
    setSaving(true);
    try {
      const created = await createFieldDefinition(getSupabase(), {
        organization_id: organization.id,
        entity_type: entityType,
        entity_id: entityId,
        field_type: newFieldType,
        label: newLabel.trim(),
        sort_order: (fieldDefs?.length ?? 0) + 1,
      });
      if (newValue.trim()) {
        await upsertFieldValues(getSupabase(), [
          {
            organization_id: organization.id,
            field_id: created.id,
            entity_id: entityId,
            entity_type: entityType,
            value: newValue.trim(),
          },
        ]);
      }
      mutateDefs();
      mutateValues();
      setAddOpen(false);
      showToast("フィールドを追加しました");
    } catch {
      showToast("フィールドの追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- フィールド削除（エンティティ固有のみ） ---
  const handleDeleteField = async (fieldId: string) => {
    if (!organization) return;
    try {
      await deleteFieldDefinition(getSupabase(), fieldId, organization.id);
      mutateDefs();
      mutateValues();
      showToast("フィールドを削除しました");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  if (!fieldDefs || fieldDefs.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            カスタムフィールド
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          >
            <Plus className="size-3" />
            追加
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">フィールドなし</p>
        <AddFieldDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          entityType={entityType}
          newLabel={newLabel}
          setNewLabel={setNewLabel}
          newFieldType={newFieldType}
          setNewFieldType={setNewFieldType}
          newValue={newValue}
          setNewValue={setNewValue}
          onAdd={handleAddField}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          カスタムフィールド
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          >
            <Plus className="size-3" />
            追加
          </button>
          <button
            onClick={handleOpenEdit}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="編集"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-4 text-sm">
        {fieldDefs.map((fd) => {
          const val = initialValues[fd.id] ?? "";
          return (
            <div key={fd.id} className="flex gap-8">
              <span className="text-muted-foreground w-20 shrink-0">{fd.label}</span>
              <span className="font-medium text-right flex-1">
                {formatDisplayValue(fd, val) || "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* 値編集ダイアログ */}
      <DialogPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="カスタムフィールド編集"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleSaveValues} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {fieldDefs.map((fd) => (
            <div key={fd.id} className="flex items-start gap-2">
              <div className="flex-1">
                <CustomFieldEditor
                  field={fd}
                  value={localValues[fd.id] ?? ""}
                  onChange={(v) => handleChange(fd.id, v)}
                />
              </div>
              {fd.entity_id && (
                <button
                  type="button"
                  onClick={() => handleDeleteField(fd.id)}
                  className="mt-6 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  title="このフィールドを削除"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </DialogPanel>

      {/* フィールド追加ダイアログ */}
      <AddFieldDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        entityType={entityType}
        newLabel={newLabel}
        setNewLabel={setNewLabel}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newValue={newValue}
        setNewValue={setNewValue}
        onAdd={handleAddField}
        saving={saving}
      />
    </div>
  );
}

// --- フィールド追加ダイアログ ---

const ENTITY_TYPE_LABELS: Record<CrmEntityType, string> = {
  company: "企業",
  contact: "連絡先",
  deal: "商談",
};

function AddFieldDialog({
  open,
  onOpenChange,
  entityType,
  newLabel,
  setNewLabel,
  newFieldType,
  setNewFieldType,
  newValue,
  setNewValue,
  onAdd,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CrmEntityType;
  newLabel: string;
  setNewLabel: (v: string) => void;
  newFieldType: CrmFieldType;
  setNewFieldType: (v: CrmFieldType) => void;
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: () => void;
  saving: boolean;
}) {
  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title="カスタムフィールドを追加"
      description={`この${ENTITY_TYPE_LABELS[entityType]}だけのカスタムフィールドを追加します。`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={onAdd} disabled={!newLabel.trim() || saving}>
            {saving ? "追加中..." : "追加"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>フィールド名 *</Label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="例: 決算月、従業員数"
            className="mt-1"
          />
        </div>
        <div>
          <Label>フィールド型</Label>
          <Select
            value={newFieldType}
            onValueChange={(v) => v && setNewFieldType(v as CrmFieldType)}
          >
            <SelectTrigger className="w-full mt-1">
              <span>{crmFieldTypeLabels[newFieldType] ?? newFieldType}</span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(crmFieldTypeLabels).map(([val, lbl]) => (
                <SelectItem key={val} value={val}>
                  {lbl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>初期値</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="任意"
            className="mt-1"
          />
        </div>
      </div>
    </DialogPanel>
  );
}

// --- フィールドエディタ ---

function CustomFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CrmFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <Label>
      {field.label}
      {field.is_required && " *"}
    </Label>
  );

  switch (field.field_type) {
    case "text":
      return (
        <div>
          {label}
          {field.description && (
            <p className="text-xs text-muted-foreground mb-1">{field.description}</p>
          )}
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
          />
        </div>
      );
    case "number":
    case "currency":
      return (
        <div>
          {label}
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? (field.field_type === "currency" ? "¥" : "")}
          />
        </div>
      );
    case "date":
      return (
        <div>
          {label}
          <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "url":
    case "email":
    case "phone":
      return (
        <div>
          {label}
          <Input
            type={
              field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "url"
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
          />
        </div>
      );
    case "dropdown":
      return (
        <div>
          {label}
          <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
            <SelectTrigger className="w-full">
              <span>{value || "選択してください"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "multi_select": {
      const selected = value ? value.split(",") : [];
      return (
        <div>
          {label}
          <div className="space-y-1 mt-1">
            {(field.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    const next = checked ? [...selected, opt] : selected.filter((s) => s !== opt);
                    onChange(next.join(","));
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
          <span>
            {field.label}
            {field.is_required && " *"}
          </span>
        </label>
      );
    default:
      return (
        <div>
          {label}
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? ""}
            rows={2}
          />
        </div>
      );
  }
}

function formatDisplayValue(field: CrmFieldDefinition, value: string): string {
  if (!value) return "";
  switch (field.field_type) {
    case "currency": {
      const num = parseFloat(value);
      return isNaN(num) ? "—" : `¥${num.toLocaleString()}`;
    }
    case "checkbox":
      return value === "true" ? "はい" : "いいえ";
    case "multi_select":
      return value.split(",").join(", ");
    default:
      return value;
  }
}
