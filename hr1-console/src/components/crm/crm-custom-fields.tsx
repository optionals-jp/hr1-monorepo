"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useCrmFieldDefinitions, useCrmFieldValues } from "@/lib/hooks/use-crm-fields";
import { upsertFieldValues } from "@/lib/repositories/crm-field-repository";
import { getSupabase } from "@/lib/supabase/browser";
import type { CrmEntityType, CrmFieldDefinition } from "@/types/database";

interface CrmCustomFieldsProps {
  entityId: string;
  entityType: CrmEntityType;
  mode: "view" | "edit";
  onSaveComplete?: () => void;
}

/**
 * カスタムフィールドの表示・編集コンポーネント
 * entityIdとentityTypeを指定して、該当するカスタムフィールドを動的に表示
 */
export function CrmCustomFields({
  entityId,
  entityType,
  mode,
  onSaveComplete,
}: CrmCustomFieldsProps) {
  const { organization } = useOrg();
  const { data: fieldDefs } = useCrmFieldDefinitions(entityType);
  const { data: fieldValues, mutate: mutateValues } = useCrmFieldValues(entityId, entityType);

  // フィールド値の初期マップをmemoで導出
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

  const saveAll = useCallback(async () => {
    if (!organization || !fieldDefs) return;
    const values = fieldDefs.map((fd) => ({
      organization_id: organization.id,
      field_id: fd.id,
      entity_id: entityId,
      entity_type: entityType,
      value: localValues[fd.id] ?? null,
    }));
    try {
      await upsertFieldValues(getSupabase(), values);
      mutateValues();
      onSaveComplete?.();
    } catch (err) {
      console.error("Failed to save custom fields:", err);
    }
  }, [organization, fieldDefs, entityId, entityType, localValues, mutateValues, onSaveComplete]);

  // saveAll を親に公開するため、refでは使えないが、edit時のonBlurで自動保存する
  // もしくは親からsaveAllを呼ぶパターンを使う

  if (!fieldDefs || fieldDefs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">カスタムフィールド</h3>
      {fieldDefs.map((fd) => (
        <CustomFieldRenderer
          key={fd.id}
          field={fd}
          value={localValues[fd.id] ?? ""}
          mode={mode}
          onChange={(v) => handleChange(fd.id, v)}
        />
      ))}
      {mode === "edit" && (
        <button type="button" onClick={saveAll} className="text-sm text-primary hover:underline">
          カスタムフィールドを保存
        </button>
      )}
    </div>
  );
}

/**
 * 個別のカスタムフィールドのレンダラー
 */
function CustomFieldRenderer({
  field,
  value,
  mode,
  onChange,
}: {
  field: CrmFieldDefinition;
  value: string;
  mode: "view" | "edit";
  onChange: (value: string) => void;
}) {
  if (mode === "view") {
    return (
      <div>
        <p className="text-sm text-muted-foreground">{field.label}</p>
        <p className="font-medium text-sm">{formatDisplayValue(field, value) || "—"}</p>
      </div>
    );
  }

  switch (field.field_type) {
    case "text":
      return (
        <div>
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
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
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
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
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
          <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case "url":
    case "email":
    case "phone":
      return (
        <div>
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
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
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
          <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
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
          <Label>
            {field.label}
            {field.is_required && " *"}
          </Label>
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
          <Label>{field.label}</Label>
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
    case "currency":
      return `¥${Number(value).toLocaleString()}`;
    case "checkbox":
      return value === "true" ? "はい" : "いいえ";
    case "multi_select":
      return value.split(",").join(", ");
    default:
      return value;
  }
}
