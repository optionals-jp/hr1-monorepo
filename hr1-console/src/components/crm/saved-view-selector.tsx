"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { useSavedViews } from "@/lib/hooks/use-saved-views";
import type { CrmEntityType, CrmSavedViewConfig, CrmSavedViewFilter } from "@/types/database";
import { Bookmark, Plus, Trash2, Share2, X } from "lucide-react";

const OPERATOR_LABELS: Record<string, string> = {
  eq: "等しい",
  neq: "等しくない",
  contains: "含む",
  gt: "より大きい",
  lt: "より小さい",
  gte: "以上",
  lte: "以下",
  empty: "空",
  not_empty: "空でない",
};

interface SavedViewSelectorProps {
  entityType: CrmEntityType;
  availableFields: { key: string; label: string }[];
  currentConfig: CrmSavedViewConfig;
  onApplyView: (config: CrmSavedViewConfig) => void;
}

export function SavedViewSelector({
  entityType,
  availableFields,
  currentConfig,
  onApplyView,
}: SavedViewSelectorProps) {
  const { showToast } = useToast();
  const { views, activeViewId, setActiveViewId, saveView, deleteView } = useSavedViews(entityType);
  const [saveOpen, setSaveOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewShared, setNewViewShared] = useState(false);

  // フィルタ編集
  const [filterOpen, setFilterOpen] = useState(false);
  const [editFilters, setEditFilters] = useState<CrmSavedViewFilter[]>(currentConfig.filters ?? []);

  const handleSelectView = (viewId: string) => {
    if (viewId === "__none__") {
      setActiveViewId(null);
      onApplyView({});
      return;
    }
    const view = views.find((v) => v.id === viewId);
    if (view) {
      setActiveViewId(view.id);
      onApplyView(view.config);
    }
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    try {
      await saveView(newViewName.trim(), currentConfig, newViewShared);
      setSaveOpen(false);
      setNewViewName("");
      setNewViewShared(false);
      showToast("ビューを保存しました");
    } catch {
      showToast("ビューの保存に失敗しました", "error");
    }
  };

  const handleDeleteView = async (id: string) => {
    try {
      await deleteView(id);
      showToast("ビューを削除しました");
    } catch {
      showToast("ビューの削除に失敗しました", "error");
    }
  };

  const addFilter = () => {
    if (availableFields.length === 0) return;
    setEditFilters((prev) => [
      ...prev,
      { field: availableFields[0].key, operator: "contains", value: "" },
    ]);
  };

  const removeFilter = (index: number) => {
    setEditFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, patch: Partial<CrmSavedViewFilter>) => {
    setEditFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const applyFilters = () => {
    const validFilters = editFilters.filter(
      (f) => f.operator === "empty" || f.operator === "not_empty" || f.value.trim()
    );
    onApplyView({ ...currentConfig, filters: validFilters });
    setFilterOpen(false);
  };

  const activeFiltersCount = (currentConfig.filters ?? []).length;

  return (
    <div className="flex items-center gap-2">
      {/* ビュー選択 */}
      <Select value={activeViewId ?? "__none__"} onValueChange={handleSelectView}>
        <SelectTrigger className="w-48">
          <Bookmark className="size-4 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="ビューを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">デフォルト</SelectItem>
          {views.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <span className="flex items-center gap-1.5">
                {v.name}
                {v.is_shared && <Share2 className="size-3 text-muted-foreground" />}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* フィルタ */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            フィルタ
            {activeFiltersCount > 0 && (
              <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-4" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">フィルタ条件</h4>
              <Button variant="ghost" size="sm" onClick={addFilter}>
                <Plus className="size-4 mr-1" />
                追加
              </Button>
            </div>
            {editFilters.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">フィルタ条件なし</p>
            )}
            {editFilters.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={f.field} onValueChange={(v) => updateFilter(i, { field: v })}>
                  <SelectTrigger className="w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((af) => (
                      <SelectItem key={af.key} value={af.key}>
                        {af.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={f.operator}
                  onValueChange={(v) =>
                    updateFilter(i, { operator: v as CrmSavedViewFilter["operator"] })
                  }
                >
                  <SelectTrigger className="w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATOR_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {f.operator !== "empty" && f.operator !== "not_empty" && (
                  <Input
                    className="flex-1 text-xs h-8"
                    value={f.value}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    placeholder="値"
                  />
                )}
                <button
                  onClick={() => removeFilter(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditFilters([]);
                  onApplyView({ ...currentConfig, filters: [] });
                  setFilterOpen(false);
                }}
              >
                クリア
              </Button>
              <Button size="sm" onClick={applyFilters}>
                適用
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* ビュー保存 */}
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            ビュー保存
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">ビュー名</Label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="例: 高確度商談"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={newViewShared} onCheckedChange={(c) => setNewViewShared(!!c)} />
              チームに共有
            </label>
            <Button size="sm" className="w-full" onClick={handleSaveView}>
              保存
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* アクティブビュー削除 */}
      {activeViewId && (
        <button
          onClick={() => handleDeleteView(activeViewId)}
          className="text-muted-foreground hover:text-destructive"
          title="ビューを削除"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
