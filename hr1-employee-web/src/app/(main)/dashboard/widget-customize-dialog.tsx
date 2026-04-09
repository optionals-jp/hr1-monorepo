"use client";

import { useState, useEffect } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import { DEFAULT_WIDGETS } from "@/lib/hooks/use-dashboard";
import type { DashboardWidgetConfig } from "@/types/database";

interface WidgetCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: DashboardWidgetConfig[];
  onSave: (config: DashboardWidgetConfig[]) => Promise<void>;
}

export function WidgetCustomizeDialog({
  open,
  onOpenChange,
  currentConfig,
  onSave,
}: WidgetCustomizeDialogProps) {
  const [config, setConfig] = useState<DashboardWidgetConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setConfig([...currentConfig]);
    }
  }, [open, currentConfig]);

  const toggleWidget = (widgetId: string) => {
    setConfig((prev) =>
      prev.map((w) => (w.widget_id === widgetId ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      onOpenChange(false);
    } catch (e) {
      console.error("ウィジェット設定保存エラー:", e);
    } finally {
      setSaving(false);
    }
  };

  const widgetLabels = Object.fromEntries(DEFAULT_WIDGETS.map((w) => [w.id, w.label]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>ダッシュボード設定</DialogTitle>
          <DialogDescription>表示するウィジェットを選択してください</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {config.map((w) => (
            <label
              key={w.widget_id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={w.visible}
                onChange={() => toggleWidget(w.widget_id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                {widgetLabels[w.widget_id] ?? w.widget_id}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
