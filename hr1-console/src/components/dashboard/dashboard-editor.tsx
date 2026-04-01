"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DATA_SOURCE_REGISTRY, getSourcesForTab } from "@/lib/dashboard/data-sources";
import type {
  DashboardWidgetConfigV2,
  WidgetDisplayType,
  WidgetLayout,
  DataSourceId,
} from "@/types/dashboard";
import type { ProductTab } from "@/components/layout/sidebar";
import {
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  ArrowLeft,
  Users,
  UserPlus,
  Briefcase,
  ClipboardList,
  Building2,
  Target,
  TrendingUp,
  FolderKanban,
  AlertTriangle,
  Handshake,
  Hash,
  BarChart3,
  PieChart,
  DollarSign,
} from "lucide-react";

const SOURCE_ICONS: Record<DataSourceId, React.ElementType> = {
  recruiting_summary: UserPlus,
  target_progress: Target,
  pipeline: ClipboardList,
  kpi_trend: TrendingUp,
  department_recruiting: Building2,
  open_jobs: Briefcase,
  workspace_summary: Users,
  pending_actions: AlertTriangle,
  employee_department: Building2,
  hiring_type: FolderKanban,
  client_summary: Handshake,
  recent_deals: Handshake,
  crm_pipeline: FolderKanban,
  crm_monthly_revenue: DollarSign,
  crm_deal_status: PieChart,
  crm_rep_performance: BarChart3,
};

const DISPLAY_TYPE_LABELS: Record<WidgetDisplayType, string> = {
  metric: "数値",
  bar_chart: "棒グラフ",
  area_chart: "エリアチャート",
  pie_chart: "円グラフ",
  pipeline: "パイプライン",
  progress: "進捗バー",
  list: "リスト",
};

const LAYOUT_LABELS: Record<WidgetLayout, string> = {
  full: "全幅",
  left: "左",
  right: "右",
};

interface DashboardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardWidgetConfigV2[];
  tab: ProductTab;
  onSave: (config: DashboardWidgetConfigV2[]) => void;
}

function DashboardEditorInner({
  config,
  tab,
  onSave,
  onClose,
}: {
  config: DashboardWidgetConfigV2[];
  tab: ProductTab;
  onSave: (config: DashboardWidgetConfigV2[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<DashboardWidgetConfigV2[]>(() => [...config]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const selectedWidget = items.find((w) => w.id === selectedWidgetId) ?? null;

  const updateWidget = (id: string, updates: Partial<DashboardWidgetConfigV2>) => {
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  const moveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const deleteWidget = (id: string) => {
    setItems((prev) => prev.filter((w) => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const addWidget = (sourceId: string) => {
    const source = DATA_SOURCE_REGISTRY[sourceId as keyof typeof DATA_SOURCE_REGISTRY];
    if (!source) return;
    const newWidget: DashboardWidgetConfigV2 = {
      id: crypto.randomUUID(),
      visible: true,
      layout: source.defaultLayout,
      displayType: source.defaultDisplayType,
      dataSource: source.id,
      _v: 2,
    };
    setItems((prev) => [...prev, newWidget]);
    setSelectedWidgetId(newWidget.id);
    setShowAddPanel(false);
  };

  const getWidgetLabel = (widget: DashboardWidgetConfigV2) => {
    return widget.title || DATA_SOURCE_REGISTRY[widget.dataSource]?.label || "";
  };

  const availableSources = getSourcesForTab(tab);

  return (
    <>
      <DialogHeader>
        <DialogTitle>ダッシュボードを編集</DialogTitle>
      </DialogHeader>

      <div className="flex gap-4" style={{ minHeight: 400 }}>
        {/* Left panel: widget list */}
        <div className="flex w-3/5 flex-col gap-2">
          <div className="flex items-center justify-between">
            {showAddPanel ? (
              <Button variant="ghost" size="sm" onClick={() => setShowAddPanel(false)}>
                <ArrowLeft data-icon="inline-start" />
                戻る
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={() => setShowAddPanel(true)}>
                <Plus data-icon="inline-start" />
                ウィジェットを追加
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {showAddPanel ? (
              <div className="grid grid-cols-2 gap-2">
                {availableSources.map((source) => {
                  const Icon = SOURCE_ICONS[source.id] ?? Hash;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                      onClick={() => addWidget(source.id)}
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{source.label}</div>
                        <div className="text-xs text-muted-foreground">{source.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((widget, index) => (
                  <div
                    key={widget.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-muted",
                      selectedWidgetId === widget.id && "border-primary ring-1 ring-primary"
                    )}
                    onClick={() => setSelectedWidgetId(widget.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedWidgetId(widget.id);
                      }
                    }}
                  >
                    <Switch
                      checked={widget.visible}
                      onCheckedChange={(checked) => updateWidget(widget.id, { visible: !!checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{getWidgetLabel(widget)}</div>
                      <div className="flex gap-1">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {DISPLAY_TYPE_LABELS[widget.displayType]}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {LAYOUT_LABELS[widget.layout]}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidget(index, -1);
                        }}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveWidget(index, 1);
                        }}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWidget(widget.id);
                        }}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    ウィジェットがありません
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: settings */}
        <div className="w-2/5 rounded-lg border bg-muted/30 p-4">
          {selectedWidget ? (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium">ウィジェット設定</h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">タイトル</label>
                <Input
                  value={selectedWidget.title ?? ""}
                  placeholder={DATA_SOURCE_REGISTRY[selectedWidget.dataSource]?.label}
                  onChange={(e) =>
                    updateWidget(selectedWidget.id, {
                      title: e.target.value || undefined,
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">レイアウト</label>
                <div
                  className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5"
                  data-slot="button-group"
                >
                  {(["full", "left", "right"] as WidgetLayout[]).map((layout) => (
                    <Button
                      key={layout}
                      variant={selectedWidget.layout === layout ? "primary" : "ghost"}
                      size="xs"
                      onClick={() => updateWidget(selectedWidget.id, { layout })}
                    >
                      {LAYOUT_LABELS[layout]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">表示タイプ</label>
                <Select
                  value={selectedWidget.displayType}
                  onValueChange={(val) =>
                    updateWidget(selectedWidget.id, {
                      displayType: val as WidgetDisplayType,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCE_REGISTRY[selectedWidget.dataSource]?.compatibleDisplayTypes.map(
                      (dt) => (
                        <SelectItem key={dt} value={dt}>
                          {DISPLAY_TYPE_LABELS[dt]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">データソース</label>
                <Select
                  value={selectedWidget.dataSource}
                  onValueChange={(val) => {
                    const newSource =
                      DATA_SOURCE_REGISTRY[val as keyof typeof DATA_SOURCE_REGISTRY];
                    if (!newSource) return;
                    const compatible = newSource.compatibleDisplayTypes.includes(
                      selectedWidget.displayType
                    );
                    updateWidget(selectedWidget.id, {
                      dataSource: newSource.id,
                      displayType: compatible
                        ? selectedWidget.displayType
                        : newSource.defaultDisplayType,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              ウィジェットを選択して設定を編集
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onSave(items);
            onClose();
          }}
        >
          保存
        </Button>
      </DialogFooter>
    </>
  );
}

export function DashboardEditor({ open, onOpenChange, config, tab, onSave }: DashboardEditorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
        {open && (
          <DashboardEditorInner
            key={String(open)}
            config={config}
            tab={tab}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
