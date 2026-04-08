"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as pipelineRepo from "@/lib/repositories/pipeline-repository";
import type { CrmPipelineStage } from "@/types/database";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
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
      <Button variant="ghost" size="icon-xs" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDelete}
        className="text-muted-foreground hover:text-red-600"
      >
        <Trash2 className="size-4" />
      </Button>
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

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: pipelines, mutate } = usePipelines();

  const pipeline = pipelines?.find((p) => p.id === id);
  const stgs = pipeline?.crm_pipeline_stages ?? [];

  const [editStageOpen, setEditStageOpen] = useState(false);
  const [editStageData, setEditStageData] = useState<Partial<CrmPipelineStage>>({});
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleSetDefault = async () => {
    if (!organization || !pipeline || pipeline.is_default) return;
    try {
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

  const handleDeletePipeline = async () => {
    if (!organization || !pipeline) return;
    if (pipeline.is_default) {
      showToast("デフォルトパイプラインは削除できません", "error");
      return;
    }
    try {
      await pipelineRepo.deletePipeline(getSupabase(), pipeline.id, organization.id);
      mutate();
      showToast("パイプラインを削除しました");
      router.push("/crm/settings/pipelines");
    } catch {
      showToast("パイプラインの削除に失敗しました", "error");
    }
  };

  const openStageCreate = () => {
    setEditStageData({ color: "#3b82f6", probability_default: 50, sort_order: stgs.length });
    setEditStageOpen(true);
  };

  const openStageEdit = (stage: CrmPipelineStage) => {
    setEditStageData({ ...stage });
    setEditStageOpen(true);
  };

  const handleSaveStage = async () => {
    if (!pipeline || !editStageData.name?.trim()) {
      showToast("ステージ名を入力してください", "error");
      return;
    }
    try {
      if (editStageData.id) {
        await pipelineRepo.updateStage(getSupabase(), editStageData.id, pipeline.id, {
          name: editStageData.name.trim(),
          color: editStageData.color ?? "#3b82f6",
          probability_default: editStageData.probability_default ?? 0,
        });
      } else {
        await pipelineRepo.createStage(getSupabase(), {
          pipeline_id: pipeline.id,
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
    if (!editStageData.id || !pipeline) return;
    try {
      await pipelineRepo.deleteStage(getSupabase(), editStageData.id, pipeline.id);
      setEditStageOpen(false);
      mutate();
      showToast("ステージを削除しました");
    } catch {
      showToast("ステージの削除に失敗しました", "error");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const stageId = event.active.id as string;
    const found = stgs.find((s) => s.id === stageId);
    if (found) setActiveDragStage(found);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragStage(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !pipeline) return;

    const oldIndex = stgs.findIndex((s) => s.id === active.id);
    const newIndex = stgs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stgs, oldIndex, newIndex);
    const updates = reordered.map((s, i) => ({ id: s.id, sort_order: i }));
    try {
      await pipelineRepo.reorderStages(getSupabase(), pipeline.id, updates);
      mutate();
    } catch {
      showToast("並び替えに失敗しました", "error");
    }
  };

  if (pipelines && !pipeline) {
    return (
      <div className="flex flex-col bg-white">
        <PageHeader
          title="パイプライン"
          sticky={false}
          border={false}
          breadcrumb={[
            { label: "CRM設定", href: "/crm/settings/pipelines" },
            { label: "パイプライン設定", href: "/crm/settings/pipelines" },
          ]}
        />
        <PageContent>
          <p className="text-sm text-muted-foreground text-center py-12">
            パイプラインが見つかりません
          </p>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white">
      <PageHeader
        title={pipeline?.name ?? "パイプライン"}
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM設定", href: "/crm/settings/pipelines" },
          { label: "パイプライン設定", href: "/crm/settings/pipelines" },
        ]}
        action={
          <div className="flex gap-2">
            {pipeline && !pipeline.is_default && (
              <>
                <Button variant="outline" size="sm" onClick={handleSetDefault}>
                  <Star className="size-4 mr-1.5" />
                  デフォルトに設定
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openConfirm(
                      "パイプラインの削除",
                      `「${pipeline.name}」を削除しますか？この操作は元に戻せません。`,
                      handleDeletePipeline
                    )
                  }
                >
                  <Trash2 className="size-4 mr-1.5" />
                  削除
                </Button>
              </>
            )}
            <Button onClick={openStageCreate}>
              <Plus className="size-4 mr-1.5" />
              ステージ追加
            </Button>
          </div>
        }
      />

      <PageContent>
        {pipeline?.is_default && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Star className="size-3.5" />
            デフォルトパイプライン
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            <SortableContext items={stgs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
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
                          await pipelineRepo.deleteStage(getSupabase(), stage.id, pipeline!.id);
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
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">ステージがありません</p>
                <p className="text-xs mt-1">「ステージ追加」から作成してください</p>
              </div>
            )}
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
      </PageContent>

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
