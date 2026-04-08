"use client";

import { Fragment, useState, useCallback, useEffect, useReducer, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { DATA_SOURCE_REGISTRY } from "@/lib/dashboard/data-sources";
import {
  DEFAULT_RECRUITING_WIDGETS,
  DEFAULT_WORKSPACE_WIDGETS,
  DEFAULT_CLIENT_WIDGETS,
} from "@/lib/dashboard/defaults";
import {
  editorReducer,
  INITIAL_EDITOR_STATE,
  rowsToWidgets,
} from "@/components/dashboard/editor-reducer";
import {
  RowDropZone,
  SideDropZone,
  DraggableWidgetCard,
  WidgetSettingsPanel,
  AddWidgetPanel,
} from "@/components/dashboard/editor-components";
import type { DashboardWidgetConfigV2 } from "@/types/dashboard";
import type { ProductTab } from "@/components/layout/sidebar";
import type { DashboardData } from "@/components/dashboard/widget-renderer";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { Eye, Plus } from "lucide-react";

export default function DashboardSettingsPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const rawTab = searchParams.get("tab");
  const tab: ProductTab =
    rawTab === "recruiting" || rawTab === "workspace" || rawTab === "client"
      ? rawTab
      : "recruiting";

  const {
    recruitingWidgetConfig,
    workspaceWidgetConfig,
    clientWidgetConfig,
    recruitingConfigLoading,
    workspaceConfigLoading,
    clientConfigLoading,
    saveWidgetConfig,
    stats,
    pipeline,
    kpiTrend,
    departmentStats,
    openJobs,
    empDeptStats,
    pendingWorkflows,
    leaveUsageRate,
    attendanceAnomalies,
    hiringTypeStats,
    hiringTypeAppStats,
    targets,
    crmCompanyCount,
    crmContactCount,
    crmOpenDeals,
    crmWonDeals,
    crmTotalAmount,
    crmWonAmount,
    crmDeals,
  } = useDashboard(tab);

  const loadingMap: Record<string, boolean> = {
    recruiting: recruitingConfigLoading,
    workspace: workspaceConfigLoading,
    client: clientConfigLoading,
  };
  const configLoading = loadingMap[tab] ?? false;

  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);
  const { widgetMap, rows } = state;

  const [initialized, setInitialized] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const pipelineRate =
    pipeline && pipeline.length >= 2 && pipeline[0].count > 0
      ? Math.round((pipeline[pipeline.length - 1].count / pipeline[0].count) * 100)
      : 0;

  const dashboardData: DashboardData = {
    stats,
    pipeline,
    kpiTrend,
    departmentStats,
    openJobs,
    empDeptStats,
    pendingWorkflows,
    leaveUsageRate,
    attendanceAnomalies,
    hiringTypeStats,
    hiringTypeAppStats,
    targets,
    pipelineRate,
    crmCompanyCount,
    crmContactCount,
    crmOpenDeals,
    crmWonDeals,
    crmTotalAmount,
    crmWonAmount,
    crmDeals,
  };

  useEffect(() => {
    if (initialized || configLoading) return;
    const cfgMap: Record<string, DashboardWidgetConfigV2[] | undefined> = {
      recruiting: recruitingWidgetConfig,
      workspace: workspaceWidgetConfig,
      client: clientWidgetConfig,
    };
    const saved = cfgMap[tab];
    const config =
      saved && saved.length > 0
        ? saved
        : tab === "workspace"
          ? DEFAULT_WORKSPACE_WIDGETS
          : tab === "client"
            ? DEFAULT_CLIENT_WIDGETS
            : DEFAULT_RECRUITING_WIDGETS;
    dispatch({ type: "INIT", config });
    setInitialized(true);
  }, [
    recruitingWidgetConfig,
    workspaceWidgetConfig,
    clientWidgetConfig,
    tab,
    initialized,
    configLoading,
  ]);

  const activeWidget = activeId ? (widgetMap.get(activeId) ?? null) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const usedSources = useMemo(
    () => new Set(Array.from(widgetMap.values()).map((w) => w.dataSource)),
    [widgetMap]
  );

  const updateWidget = useCallback((id: string, updates: Partial<DashboardWidgetConfigV2>) => {
    dispatch({ type: "UPDATE_WIDGET", id, updates });
    setDirty(true);
  }, []);

  const deleteWidget = useCallback(
    (id: string) => {
      const widget = widgetMap.get(id);
      const label =
        widget?.title ||
        (widget?.dataSource ? DATA_SOURCE_REGISTRY[widget.dataSource]?.label : undefined) ||
        "ウィジェット";
      if (!window.confirm(`「${label}」を削除しますか？`)) return;

      dispatch({ type: "DELETE_WIDGET", id });
      setDirty(true);
      if (selectedWidgetId === id) setSelectedWidgetId(null);
    },
    [selectedWidgetId, widgetMap]
  );

  const addWidget = useCallback((sourceId: string) => {
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
    dispatch({ type: "ADD_WIDGET", widget: newWidget });
    setDirty(true);
    setSelectedWidgetId(newWidget.id);
    setShowAddPanel(false);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    let dropTarget;

    if (overId.startsWith("between-")) {
      const rowIndex = parseInt(overId.replace("between-", ""), 10);
      dropTarget = { type: "between" as const, rowIndex };
    } else if (overId.startsWith("side-")) {
      const parts = overId.split("-");
      dropTarget = {
        type: "side" as const,
        rowIndex: parseInt(parts[1], 10),
        position: parts[2] as "left" | "right",
      };
    } else {
      return;
    }

    dispatch({ type: "APPLY_DROP", widgetId: active.id as string, dropTarget });
    setDirty(true);
  }, []);

  const handleApplyTemplate = useCallback((template: "single" | "double") => {
    dispatch({ type: "APPLY_TEMPLATE", template });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const flatWidgets = rowsToWidgets(rows, widgetMap);
      await saveWidgetConfig(tab, flatWidgets);
      setDirty(false);
      showToast("ダッシュボードを保存しました");
    } catch {
      showToast("保存に失敗しました。もう一度お試しください。", "error");
    } finally {
      setSaving(false);
    }
  }, [saveWidgetConfig, tab, rows, widgetMap, showToast]);

  const [prevTab, setPrevTab] = useState(tab);
  useEffect(() => {
    if (tab !== prevTab) {
      setPrevTab(tab);
      setInitialized(false);
      setDirty(false);
      setSelectedWidgetId(null);
      setShowAddPanel(false);
      setPreviewMode(false);
    }
  }, [tab, prevTab]);

  const handleResetToDefault = useCallback(() => {
    if (!window.confirm("デフォルトのレイアウトに戻しますか？現在の変更は失われます。")) return;
    const defaultConfig =
      tab === "workspace"
        ? DEFAULT_WORKSPACE_WIDGETS
        : tab === "client"
          ? DEFAULT_CLIENT_WIDGETS
          : DEFAULT_RECRUITING_WIDGETS;
    dispatch({ type: "INIT", config: defaultConfig });
    setDirty(true);
    setSelectedWidgetId(null);
  }, [tab]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (configLoading) {
    return (
      <div className="px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted/40 rounded" />
          <div className="h-20 bg-muted/40 rounded-xl" />
          <div className="h-20 bg-muted/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 md:px-8 md:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold tracking-tight">ダッシュボードのカスタマイズ</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={previewMode ? "primary" : "outline"}
            size="sm"
            onClick={() => setPreviewMode((v) => !v)}
          >
            <Eye className="size-3.5 mr-1" />
            プレビュー
          </Button>
          {!previewMode && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleApplyTemplate("single")}>
                1カラム
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleApplyTemplate("double")}>
                2カラム
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                デフォルトに戻す
              </Button>
            </>
          )}
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {previewMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rows.flatMap((row) =>
            row.widgetIds
              .map((wid) => widgetMap.get(wid))
              .filter((w): w is DashboardWidgetConfigV2 => !!w && w.visible)
              .map((w) => {
                const isFull = row.widgetIds.length === 1;
                return (
                  <div
                    key={w.id}
                    className={cn(isFull && "md:col-span-2", !isFull && "md:col-span-1")}
                  >
                    <WidgetRenderer config={w} data={dashboardData} />
                  </div>
                );
              })
          )}
          {rows.flatMap((r) => r.widgetIds).filter((id) => widgetMap.get(id)?.visible).length ===
            0 && (
            <div className="md:col-span-2 flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">表示するウィジェットがありません</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-1">
              <RowDropZone id="between-0" isOverCurrent={false} />

              {rows.map((row, i) => {
                const isSingle = row.widgetIds.length === 1;
                const isDraggingSelf = isSingle && activeId === row.widgetIds[0];
                const showSideZones = isSingle && !!activeId && !isDraggingSelf;

                return (
                  <Fragment key={row.id}>
                    <div className="relative">
                      <div className="grid grid-cols-2 gap-3">
                        {row.widgetIds.map((wid) => {
                          const widget = widgetMap.get(wid);
                          if (!widget) return null;
                          return (
                            <div key={wid} className={cn(isSingle && "col-span-2")}>
                              <DraggableWidgetCard
                                widget={widget}
                                isSelected={selectedWidgetId === wid}
                                onSelect={() =>
                                  setSelectedWidgetId(selectedWidgetId === wid ? null : wid)
                                }
                                onToggleVisibility={() =>
                                  updateWidget(wid, { visible: !widget.visible })
                                }
                                onDelete={() => deleteWidget(wid)}
                                span={isSingle ? 2 : 1}
                              />
                              {selectedWidgetId === wid && (
                                <div className="mt-2">
                                  <WidgetSettingsPanel
                                    widget={widget}
                                    tab={tab}
                                    onUpdate={(updates) => updateWidget(wid, updates)}
                                    onClose={() => setSelectedWidgetId(null)}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {showSideZones && (
                        <SideDropZone id={`side-${i}-left`} isDragging side="left" />
                      )}
                      {showSideZones && (
                        <SideDropZone id={`side-${i}-right`} isDragging side="right" />
                      )}
                    </div>

                    <RowDropZone id={`between-${i + 1}`} isOverCurrent={false} />
                  </Fragment>
                );
              })}

              {rows.length === 0 && (
                <div className="flex items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground">
                  <p className="text-sm">ウィジェットを追加してください</p>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeWidget ? (
                <DraggableWidgetCard
                  widget={activeWidget}
                  isSelected={false}
                  onSelect={() => {}}
                  onToggleVisibility={() => {}}
                  onDelete={() => {}}
                  span={1}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="mt-6">
            {showAddPanel ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] font-semibold">ウィジェットを追加</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddPanel(false)}>
                    閉じる
                  </Button>
                </div>
                <AddWidgetPanel tab={tab} onAdd={addWidget} usedSources={usedSources} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPanel(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-4 text-[13px] font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/3"
              >
                <Plus className="size-4" />
                ウィジェットを追加
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
