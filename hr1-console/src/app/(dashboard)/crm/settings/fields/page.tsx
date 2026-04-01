"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useCrmFieldDefinitions } from "@/lib/hooks/use-crm-fields";
import { getSupabase } from "@/lib/supabase/browser";
import * as fieldRepo from "@/lib/repositories/crm-field-repository";
import {
  crmFieldTypeLabels,
  crmEntityTypeLabels,
  fieldTypeNeedsOptions,
} from "@/lib/constants/crm";
import type { CrmEntityType, CrmFieldDefinition, CrmFieldType } from "@/types/database";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ENTITY_TYPES: CrmEntityType[] = ["company", "contact", "deal"];

export default function CrmFieldSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: allFields, mutate } = useCrmFieldDefinitions();
  const [filterEntity, setFilterEntity] = useState<CrmEntityType | "all">("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<CrmFieldDefinition>>({});
  const [optionsText, setOptionsText] = useState("");

  const filtered =
    filterEntity === "all"
      ? (allFields ?? [])
      : (allFields ?? []).filter((f) => f.entity_type === filterEntity);

  // グループ化して表示
  const grouped = ENTITY_TYPES.map((et) => ({
    entityType: et,
    label: crmEntityTypeLabels[et],
    fields: filtered.filter((f) => f.entity_type === et),
  })).filter((g) => filterEntity === "all" || g.entityType === filterEntity);

  const openCreate = () => {
    setEditData({
      entity_type: filterEntity === "all" ? "deal" : filterEntity,
      field_type: "text" as CrmFieldType,
      is_required: false,
    });
    setOptionsText("");
    setEditOpen(true);
  };

  const openEdit = (field: CrmFieldDefinition) => {
    setEditData({ ...field });
    setOptionsText(field.options?.join("\n") ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!organization || !editData.label?.trim() || !editData.entity_type || !editData.field_type) {
      showToast("必須項目を入力してください", "error");
      return;
    }

    const options = fieldTypeNeedsOptions.has(editData.field_type)
      ? optionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    try {
      if (editData.id) {
        await fieldRepo.updateFieldDefinition(getSupabase(), editData.id, organization.id, {
          label: editData.label.trim(),
          field_type: editData.field_type as CrmFieldType,
          description: editData.description || null,
          placeholder: editData.placeholder || null,
          is_required: editData.is_required ?? false,
          options,
          field_group: editData.field_group || null,
        });
      } else {
        const fieldCount = (allFields ?? []).filter(
          (f) => f.entity_type === editData.entity_type
        ).length;
        await fieldRepo.createFieldDefinition(getSupabase(), {
          organization_id: organization.id,
          entity_type: editData.entity_type,
          field_type: editData.field_type,
          label: editData.label.trim(),
          description: editData.description || null,
          placeholder: editData.placeholder || null,
          is_required: editData.is_required ?? false,
          options,
          field_group: editData.field_group || null,
          sort_order: fieldCount,
        });
      }
      setEditOpen(false);
      mutate();
      showToast(editData.id ? "フィールドを更新しました" : "フィールドを追加しました");
    } catch {
      showToast("フィールドの保存に失敗しました", "error");
    }
  };

  const handleDelete = async () => {
    if (!editData.id) return;
    try {
      await fieldRepo.deleteFieldDefinition(getSupabase(), editData.id, organization!.id);
      setEditOpen(false);
      mutate();
      showToast("フィールドを削除しました");
    } catch {
      showToast("フィールドの削除に失敗しました", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="カスタムフィールド設定"
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1.5" />
            フィールド追加
          </Button>
        }
      />

      {/* エンティティフィルタ */}
      <div className="mb-6 flex gap-1">
        {(["all", ...ENTITY_TYPES] as const).map((et) => (
          <button
            key={et}
            onClick={() => setFilterEntity(et)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filterEntity === et ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {et === "all" ? "すべて" : crmEntityTypeLabels[et]}
          </button>
        ))}
      </div>

      {/* フィールド一覧 */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.entityType}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {group.label}（{group.fields.length}フィールド）
            </h2>
            {group.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                カスタムフィールドはありません
              </p>
            ) : (
              <div className="space-y-2">
                {group.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{field.label}</p>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            必須
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {crmFieldTypeLabels[field.field_type] ?? field.field_type}
                        </Badge>
                        {field.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {field.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(field)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fieldRepo.deleteFieldDefinition(
                            getSupabase(),
                            field.id,
                            organization!.id
                          );
                          mutate();
                          showToast("フィールドを削除しました");
                        } catch {
                          showToast("削除に失敗しました", "error");
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 編集パネル */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "フィールド編集" : "フィールド追加"}
        onSave={handleSave}
        onDelete={editData.id ? handleDelete : undefined}
      >
        <div className="space-y-4">
          <div>
            <Label>対象エンティティ *</Label>
            <Select
              value={editData.entity_type ?? "deal"}
              onValueChange={(v) => setEditData((p) => ({ ...p, entity_type: v as CrmEntityType }))}
              disabled={!!editData.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>
                    {crmEntityTypeLabels[et]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>フィールド名 *</Label>
            <Input
              value={editData.label ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, label: e.target.value }))}
              placeholder="例: 契約期間"
            />
          </div>

          <div>
            <Label>フィールド型 *</Label>
            <Select
              value={editData.field_type ?? "text"}
              onValueChange={(v) => setEditData((p) => ({ ...p, field_type: v as CrmFieldType }))}
              disabled={!!editData.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(crmFieldTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fieldTypeNeedsOptions.has(editData.field_type ?? "") && (
            <div>
              <Label>選択肢（1行に1つ）</Label>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"選択肢1\n選択肢2\n選択肢3"}
                rows={4}
              />
            </div>
          )}

          <div>
            <Label>説明</Label>
            <Input
              value={editData.description ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
              placeholder="フィールドの説明（ヘルプテキスト）"
            />
          </div>

          <div>
            <Label>プレースホルダー</Label>
            <Input
              value={editData.placeholder ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, placeholder: e.target.value }))}
              placeholder="入力時のヒントテキスト"
            />
          </div>

          <div>
            <Label>グループ名</Label>
            <Input
              value={editData.field_group ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, field_group: e.target.value }))}
              placeholder="例: 契約情報（セクション分け用）"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={editData.is_required ?? false}
              onCheckedChange={(checked) => setEditData((p) => ({ ...p, is_required: !!checked }))}
            />
            <span>必須フィールドにする</span>
          </label>
        </div>
      </EditPanel>
    </div>
  );
}
