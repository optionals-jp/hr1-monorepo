"use client";

import { useState } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useCrmFieldDefinitions } from "@/lib/hooks/use-crm-fields";
import { getSupabase } from "@/lib/supabase/browser";
import * as fieldRepo from "@/lib/repositories/crm-field-repository";
import { crmFieldTypeLabels, crmEntityTypeLabels, fieldTypeNeedsOptions } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CrmEntityType, CrmFieldDefinition, CrmFieldType } from "@/types/database";
import { Plus, SlidersHorizontal, X } from "lucide-react";

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
    <div className="flex flex-col">
      <PageHeader
        title="カスタムフィールド設定"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1.5" />
            フィールド追加
          </Button>
        }
      />

      <StickyFilterBar>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {filterEntity !== "all" && (
              <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                対象：{crmEntityTypeLabels[filterEntity]}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterEntity("all");
                  }}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => setFilterEntity("all")}>
              <span className={cn(filterEntity === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {ENTITY_TYPES.map((et) => (
              <DropdownMenuItem key={et} className="py-2" onClick={() => setFilterEntity(et)}>
                <span className={cn(filterEntity === et && "font-medium")}>
                  {crmEntityTypeLabels[et]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>フィールド名</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>型</TableHead>
              <TableHead>説明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={!allFields}
              isEmpty={filtered.length === 0}
              emptyMessage="カスタムフィールドがありません"
            >
              {filtered.map((field) => (
                <TableRow key={field.id} className="cursor-pointer" onClick={() => openEdit(field)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      {field.is_required && (
                        <Badge variant="destructive" className="text-xs">
                          必須
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {crmEntityTypeLabels[field.entity_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {crmFieldTypeLabels[field.field_type] ?? field.field_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">
                    {field.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

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
