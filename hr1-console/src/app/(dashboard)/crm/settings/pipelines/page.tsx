"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@/components/ui/toast";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as pipelineRepo from "@/lib/repositories/pipeline-repository";
import type { CrmPipeline, CrmPipelineStage } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GripVertical, Plus, Trash2, Pencil, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#64748b",
];

function SortableStageRow({
  stage,
  onEdit,
  onDelete,
}: {
  stage: CrmPipelineStage;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background p-3",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{stage.name}</p>
        <p className="text-xs text-muted-foreground">確度: {stage.probability_default}%</p>
      </div>
      <button onClick={onEdit} className="text-muted-foreground hover:text-foreground">
        <Pencil className="size-4" />
      </button>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function StageOverlay({ stage }: { stage: CrmPipelineStage }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg w-96">
      <GripVertical className="size-4 text-muted-foreground" />
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{stage.name}</p>
        <p className="text-xs text-muted-foreground">確度: {stage.probability_default}%</p>
      </div>
    </div>
  );
}

export default function PipelineSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: pipelines, mutate } = usePipelines();

  const [editStageOpen, setEditStageOpen] = useState(false);
  const [editStageData, setEditStageData] = useState<Partial<CrmPipelineStage>>({});
  const [editPipelineId, setEditPipelineId] = useState<string | null>(null);
  const [activeDragStage, setActiveDragStage] = useState<CrmPipelineStage | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = (title: string, desc: string, action: () => Promise<void>) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
    }
  };

  // パイプライン新規作成
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showNewPipeline, setShowNewPipeline] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleCreatePipeline = async () => {
    if (!organization || !newPipelineName.trim()) return;
    try {
      await pipelineRepo.createPipeline(getSupabase(), {
        organization_id: organization.id,
        name: newPipelineName.trim(),
        is_default: !pipelines || pipelines.length === 0,
        sort_order: pipelines?.length ?? 0,
      });
      setNewPipelineName("");
      setShowNewPipeline(false);
      mutate();
      showToast("パイプラインを作成しました");
    } catch {
      showToast("パイプラインの作成に失敗しました", "error");
    }
  };

  const handleDeletePipeline = async (pipeline: CrmPipeline) => {
    if (!organization) return;
    if (pipeline.is_default) {
      showToast("デフォルトパイプラインは削除できません", "error");
      return;
    }
    try {
      await pipelineRepo.deletePipeline(getSupabase(), pipeline.id, organization.id);
      mutate();
      showToast("パイプラインを削除しました");
    } catch {
      showToast("パイプラインの削除に失敗しました", "error");
    }
  };

  const handleSetDefault = async (pipeline: CrmPipeline) => {
    if (!organization || pipeline.is_default) return;
    try {
      // 現在のデフォルトを解除
      const currentDefault = pipelines?.find((p) => p.is_default);
      if (currentDefault) {
        await pipelineRepo.updatePipeline(getSupabase(), currentDefault.id, organization.id, {
          is_default: false,
        });
      }
      await pipelineRepo.updatePipeline(getSupabase(), pipeline.id, organization.id, {
        is_default: true,
      });
      mutate();
      showToast(`「${pipeline.name}」をデフォルトに設定しました`);
    } catch {
      showToast("デフォルト設定に失敗しました", "error");
    }
  };

  const openStageCreate = (pipelineId: string) => {
    const pipeline = pipelines?.find((p) => p.id === pipelineId);
    const stageCount = pipeline?.crm_pipeline_stages?.length ?? 0;
    setEditPipelineId(pipelineId);
    setEditStageData({ color: "#3b82f6", probability_default: 50, sort_order: stageCount });
    setEditStageOpen(true);
  };

  const openStageEdit = (stage: CrmPipelineStage) => {
    setEditPipelineId(stage.pipeline_id);
    setEditStageData({ ...stage });
    setEditStageOpen(true);
  };

  const handleSaveStage = async () => {
    if (!editPipelineId || !editStageData.name?.trim()) {
      showToast("ステージ名を入力してください", "error");
      return;
    }
    try {
      if (editStageData.id) {
        await pipelineRepo.updateStage(getSupabase(), editStageData.id, editPipelineId, {
          name: editStageData.name.trim(),
          color: editStageData.color ?? "#3b82f6",
          probability_default: editStageData.probability_default ?? 0,
        });
      } else {
        await pipelineRepo.createStage(getSupabase(), {
          pipeline_id: editPipelineId,
          name: editStageData.name.trim(),
          color: editStageData.color ?? "#3b82f6",
          probability_default: editStageData.probability_default ?? 0,
          sort_order: editStageData.sort_order ?? 0,
        });
      }
      setEditStageOpen(false);
      mutate();
      showToast(editStageData.id ? "ステージを更新しました" : "ステージを追加しました");
    } catch {
      showToast("ステージの保存に失敗しました", "error");
    }
  };

  const handleDeleteStage = async () => {
    if (!editStageData.id) return;
    try {
      await pipelineRepo.deleteStage(getSupabase(), editStageData.id, editPipelineId!);
      setEditStageOpen(false);
      mutate();
      showToast("ステージを削除しました");
    } catch {
      showToast("ステージの削除に失敗しました", "error");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const stageId = event.active.id as string;
    for (const pipeline of pipelines ?? []) {
      const found = pipeline.crm_pipeline_stages?.find((s) => s.id === stageId);
      if (found) {
        setActiveDragStage(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragStage(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // ステージの並び替え
    for (const pipeline of pipelines ?? []) {
      const stgs = pipeline.crm_pipeline_stages ?? [];
      const oldIndex = stgs.findIndex((s) => s.id === active.id);
      const newIndex = stgs.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) continue;

      const reordered = arrayMove(stgs, oldIndex, newIndex);
      const updates = reordered.map((s, i) => ({ id: s.id, sort_order: i }));
      try {
        await pipelineRepo.reorderStages(getSupabase(), pipeline.id, updates);
        mutate();
      } catch {
        showToast("並び替えに失敗しました", "error");
      }
      break;
    }
  };

  return (
    <div>
      <PageHeader
        title="パイプライン設定"
        breadcrumb={[{ label: "商談管理", href: "/crm/deals" }]}
        action={
          <Button onClick={() => setShowNewPipeline(true)}>
            <Plus className="size-4 mr-1.5" />
            パイプライン追加
          </Button>
        }
      />

      {/* 新規パイプライン入力 */}
      {showNewPipeline && (
        <div className="mb-6 flex items-end gap-3 rounded-lg border p-4 bg-muted/30">
          <div className="flex-1">
            <Label>パイプライン名</Label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="例: エンタープライズ営業"
              onKeyDown={(e) => e.key === "Enter" && handleCreatePipeline()}
            />
          </div>
          <Button onClick={handleCreatePipeline}>作成</Button>
          <Button variant="outline" onClick={() => setShowNewPipeline(false)}>
            キャンセル
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
          {(pipelines ?? []).map((pipeline) => {
            const stgs = pipeline.crm_pipeline_stages ?? [];
            return (
              <div key={pipeline.id} className="rounded-lg border">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{pipeline.name}</h2>
                    {pipeline.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Star className="size-3" />
                        デフォルト
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!pipeline.is_default && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(pipeline)}
                        >
                          デフォルトに設定
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openConfirm(
                              "パイプラインの削除",
                              `「${pipeline.name}」を削除しますか？この操作は元に戻せません。`,
                              () => handleDeletePipeline(pipeline)
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <SortableContext
                    items={stgs.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {stgs.map((stage) => (
                      <SortableStageRow
                        key={stage.id}
                        stage={stage}
                        onEdit={() => openStageEdit(stage)}
                        onDelete={() =>
                          openConfirm(
                            "ステージの削除",
                            `「${stage.name}」を削除しますか？この操作は元に戻せません。`,
                            async () => {
                              try {
                                await pipelineRepo.deleteStage(
                                  getSupabase(),
                                  stage.id,
                                  pipeline.id
                                );
                                mutate();
                                showToast("ステージを削除しました");
                              } catch {
                                showToast("ステージの削除に失敗しました", "error");
                              }
                            }
                          )
                        }
                      />
                    ))}
                  </SortableContext>
                  {stgs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      ステージがありません
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => openStageCreate(pipeline.id)}
                  >
                    <Plus className="size-4 mr-1" />
                    ステージを追加
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>{activeDragStage && <StageOverlay stage={activeDragStage} />}</DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDesc}
        variant="destructive"
        confirmLabel="削除"
        onConfirm={executeConfirm}
        loading={confirmLoading}
      />

      {/* ステージ編集パネル */}
      <EditPanel
        open={editStageOpen}
        onOpenChange={setEditStageOpen}
        title={editStageData.id ? "ステージ編集" : "ステージ追加"}
        onSave={handleSaveStage}
        onDelete={editStageData.id ? handleDeleteStage : undefined}
        confirmDeleteMessage="このステージを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-4">
          <div>
            <Label>ステージ名 *</Label>
            <Input
              value={editStageData.name ?? ""}
              onChange={(e) => setEditStageData((p) => ({ ...p, name: e.target.value }))}
              placeholder="例: 初回接触"
            />
          </div>

          <div>
            <Label>デフォルト確度（{editStageData.probability_default ?? 0}%）</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={editStageData.probability_default ?? 0}
              onChange={(e) =>
                setEditStageData((p) => ({ ...p, probability_default: Number(e.target.value) }))
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <Label>色</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditStageData((p) => ({ ...p, color }))}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    editStageData.color === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-xs">カスタム:</Label>
              <input
                type="color"
                value={editStageData.color ?? "#3b82f6"}
                onChange={(e) => setEditStageData((p) => ({ ...p, color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
