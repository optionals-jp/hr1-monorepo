"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DATA_SOURCE_REGISTRY, getSourcesForTab } from "@/lib/dashboard/data-sources";
import type { DashboardWidgetConfigV2, WidgetDisplayType } from "@/types/dashboard";
import type { ProductTab } from "@/components/layout/sidebar";
import type { DataSourceId } from "@/types/dashboard";
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  BarChart3,
  TrendingUp,
  PieChart,
  List,
  Hash,
  GitBranch,
  Target,
  X,
  Users,
  UserPlus,
  Briefcase,
  ClipboardList,
  Building2,
  FolderKanban,
  AlertTriangle,
  Handshake,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const DISPLAY_TYPE_LABELS: Record<WidgetDisplayType, string> = {
  metric: "数値",
  bar_chart: "棒グラフ",
  area_chart: "エリアチャート",
  pie_chart: "円グラフ",
  pipeline: "パイプライン",
  progress: "進捗バー",
  list: "リスト",
};

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
};

const DISPLAY_TYPE_ICONS: Record<WidgetDisplayType, React.ElementType> = {
  metric: Hash,
  bar_chart: BarChart3,
  area_chart: TrendingUp,
  pie_chart: PieChart,
  pipeline: GitBranch,
  progress: Target,
  list: List,
};

/* ------------------------------------------------------------------ */
/*  RowDropZone                                                        */
/* ------------------------------------------------------------------ */

export function RowDropZone({ id, isOverCurrent }: { id: string; isOverCurrent: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const active = isOverCurrent || isOver;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-2 -my-1 rounded-full transition-all",
        active ? "h-3 bg-primary/20 border-2 border-dashed border-primary/40" : "hover:bg-muted/50"
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  SideDropZone                                                       */
/* ------------------------------------------------------------------ */

export function SideDropZone({
  id,
  isDragging,
  side,
}: {
  id: string;
  isDragging: boolean;
  side: "left" | "right";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  if (!isDragging) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute top-0 w-1/2 h-full flex items-center justify-center border-2 border-dashed transition-all",
        side === "left" ? "left-0 rounded-l-xl" : "right-0 rounded-r-xl",
        isOver ? "border-primary/50 bg-primary/10" : "border-transparent bg-transparent"
      )}
    >
      <span
        className={cn(
          "text-xs transition-opacity",
          isOver ? "text-primary/60 opacity-100" : "text-muted-foreground/30 opacity-0"
        )}
      >
        横に並べる
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DraggableWidgetCard                                                */
/* ------------------------------------------------------------------ */

export function DraggableWidgetCard({
  widget,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDelete,
  span,
  isDragOverlay,
}: {
  widget: DashboardWidgetConfigV2;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  span: number;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    disabled: isDragOverlay,
  });

  const style =
    isDragOverlay || !transform
      ? undefined
      : { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };

  const label = widget.title || DATA_SOURCE_REGISTRY[widget.dataSource]?.label || "";
  const DisplayIcon = DISPLAY_TYPE_ICONS[widget.displayType] ?? Hash;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border-2 bg-card transition-all",
        span === 2 && "col-span-2",
        isSelected
          ? "border-primary shadow-md shadow-primary/10"
          : "border-border/60 hover:border-border",
        isDragging && "invisible",
        isDragOverlay && "rotate-1 shadow-2xl border-primary",
        !widget.visible && "opacity-50"
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button type="button" className="flex-1 min-w-0 text-left" onClick={onSelect}>
          <span className="text-[13px] font-semibold truncate block">{label}</span>
        </button>

        <div className="flex items-center gap-0.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <DisplayIcon className="size-3" />
            {DISPLAY_TYPE_LABELS[widget.displayType]}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground/50 hover:text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          {widget.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground/50 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <button type="button" className="w-full px-4 py-5 text-left" onClick={onSelect}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary shrink-0">
            <DisplayIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {DISPLAY_TYPE_LABELS[widget.displayType]}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {DATA_SOURCE_REGISTRY[widget.dataSource]?.description ?? ""}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  WidgetSettingsPanel                                                 */
/* ------------------------------------------------------------------ */

export function WidgetSettingsPanel({
  widget,
  tab,
  onUpdate,
  onClose,
}: {
  widget: DashboardWidgetConfigV2;
  tab: ProductTab;
  onUpdate: (updates: Partial<DashboardWidgetConfigV2>) => void;
  onClose: () => void;
}) {
  const availableSources = getSourcesForTab(tab);
  const sourceDef = DATA_SOURCE_REGISTRY[widget.dataSource];

  return (
    <div className="rounded-xl border border-primary/20 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold">
          {widget.title || sourceDef?.label || "ウィジェット設定"}
        </h3>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            タイトル
          </label>
          <Input
            value={widget.title ?? ""}
            placeholder={sourceDef?.label}
            onChange={(e) => onUpdate({ title: e.target.value || undefined })}
          />
        </div>

        {(sourceDef?.compatibleDisplayTypes.length ?? 0) > 1 ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              表示タイプ
            </label>
            <Select
              value={widget.displayType}
              onValueChange={(val) => onUpdate({ displayType: val as WidgetDisplayType })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceDef?.compatibleDisplayTypes.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {DISPLAY_TYPE_LABELS[dt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              表示タイプ
            </label>
            <p className="text-sm text-muted-foreground mt-1.5">
              {DISPLAY_TYPE_LABELS[widget.displayType]}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            データソース
          </label>
          <Select
            value={widget.dataSource}
            onValueChange={(val) => {
              const newSource = DATA_SOURCE_REGISTRY[val as keyof typeof DATA_SOURCE_REGISTRY];
              if (!newSource) return;
              const compatible = newSource.compatibleDisplayTypes.includes(widget.displayType);
              onUpdate({
                dataSource: newSource.id,
                displayType: compatible ? widget.displayType : newSource.defaultDisplayType,
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AddWidgetPanel                                                     */
/* ------------------------------------------------------------------ */

export function AddWidgetPanel({
  tab,
  onAdd,
  usedSources,
}: {
  tab: ProductTab;
  onAdd: (sourceId: string) => void;
  usedSources: Set<string>;
}) {
  const availableSources = getSourcesForTab(tab);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {availableSources.map((source) => {
        const Icon = SOURCE_ICONS[source.id] ?? Hash;
        const isUsed = usedSources.has(source.id);
        return (
          <button
            key={source.id}
            type="button"
            className={cn(
              "flex items-start gap-3 rounded-xl border-2 border-dashed p-4 text-left transition-all hover:shadow-sm",
              isUsed
                ? "border-border/40 bg-muted/30 hover:border-border/60"
                : "border-border/60 bg-white hover:border-primary/40 hover:bg-primary/3"
            )}
            onClick={() => onAdd(source.id)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 shrink-0">
              <Icon className="size-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">{source.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{source.description}</div>
              {isUsed && <div className="text-[10px] text-muted-foreground/60 mt-1">追加済み</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
