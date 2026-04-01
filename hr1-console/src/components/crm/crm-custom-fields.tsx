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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@/components/ui/toast";
import { useCrmFieldDefinitions, useCrmFieldValues } from "@/lib/hooks/use-crm-fields";
import { upsertFieldValues } from "@/lib/repositories/crm-field-repository";
import { getSupabase } from "@/lib/supabase/browser";
import { Pencil } from "lucide-react";
import type { CrmEntityType, CrmFieldDefinition } from "@/types/database";

interface CrmCustomFieldsProps {
  entityId: string;
  entityType: CrmEntityType;
}

export function CrmCustomFields({ entityId, entityType }: CrmCustomFieldsProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const { data: fieldDefs } = useCrmFieldDefinitions(entityType);
  const { data: fieldValues, mutate: mutateValues } = useCrmFieldValues(entityId, entityType);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleOpen = useCallback(() => {
    setOverrides({});
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || !fieldDefs) return;
    setSaving(true);
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
      setDialogOpen(false);
      setOverrides({});
      showToast("カスタムフィールドを保存しました");
    } catch {
      showToast("カスタムフィールドの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, fieldDefs, entityId, entityType, localValues, mutateValues, showToast]);

  if (!fieldDefs || fieldDefs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">カスタムフィールド</h3>
        <button
          onClick={handleOpen}
          className="text-muted-foreground hover:text-foreground"
          title="編集"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
        {fieldDefs.map((fd) => {
          const val = initialValues[fd.id] ?? "";
          return (
            <div key={fd.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{fd.label}</span>
              <span className="font-medium text-right max-w-[60%]">
                {formatDisplayValue(fd, val) || "—"}
              </span>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カスタムフィールド編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {fieldDefs.map((fd) => (
              <CustomFieldEditor
                key={fd.id}
                field={fd}
                value={localValues[fd.id] ?? ""}
                onChange={(v) => handleChange(fd.id, v)}
              />
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CrmFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
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
