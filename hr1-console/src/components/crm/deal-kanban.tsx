"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import type { BcDeal, CrmPipelineStage } from "@/types/database";

interface DealKanbanProps {
  deals: BcDeal[];
  stages: CrmPipelineStage[];
  onStageChange: (dealId: string, newStageId: string, newProbability: number) => void;
  onDealClick: (dealId: string) => void;
}

function DroppableColumn({
  stage,
  children,
  count,
  totalAmount,
}: {
  stage: CrmPipelineStage;
  children: React.ReactNode;
  count: number;
  totalAmount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg bg-muted/50 border-t-4 min-h-[400px]",
        isOver && "ring-2 ring-primary/30 bg-primary/5"
      )}
      style={{ borderTopColor: stage.color }}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <Badge variant="outline" className="text-xs">
            {count}件
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {totalAmount > 0 ? `¥${totalAmount.toLocaleString()}` : "—"}
        </p>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">{children}</div>
    </div>
  );
}

function DraggableDealCard({ deal, onClick }: { deal: BcDeal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "rounded-lg border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <p className="font-medium text-sm truncate">{deal.title}</p>
      {deal.bc_companies?.name && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{deal.bc_companies.name}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-medium">
          {deal.amount != null ? `¥${deal.amount.toLocaleString()}` : "—"}
        </span>
        {deal.probability != null && (
          <span className="text-xs text-muted-foreground">{deal.probability}%</span>
        )}
      </div>
      {deal.expected_close_date && (
        <p className="text-xs text-muted-foreground mt-1">{deal.expected_close_date}</p>
      )}
    </div>
  );
}

function DealCardOverlay({ deal }: { deal: BcDeal }) {
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg w-64">
      <p className="font-medium text-sm truncate">{deal.title}</p>
      {deal.bc_companies?.name && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{deal.bc_companies.name}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-medium">
          {deal.amount != null ? `¥${deal.amount.toLocaleString()}` : "—"}
        </span>
        {deal.probability != null && (
          <span className="text-xs text-muted-foreground">{deal.probability}%</span>
        )}
      </div>
    </div>
  );
}

/**
 * ステージIDまたはレガシーstageキーで商談をグルーピングするヘルパー
 */
function matchDealToStage(deal: BcDeal, stage: CrmPipelineStage): boolean {
  // stage_id が設定されていればそれで判定
  if (deal.stage_id) return deal.stage_id === stage.id;
  // レガシー: stageキーがステージ名と一致するか、ステージIDと一致するか
  return deal.stage === stage.id || deal.stage === stage.name;
}

export function DealKanban({ deals, stages, onStageChange, onDealClick }: DealKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<BcDeal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const stageIds = new Set(stages.map((s) => s.id));

  const dealsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage.id] = deals.filter((d) => matchDealToStage(d, stage) && d.status === "open");
      return acc;
    },
    {} as Record<string, BcDeal[]>
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as BcDeal | undefined;
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const deal = active.data.current?.deal as BcDeal | undefined;
    const targetStageId = over.id as string;

    if (!deal) return;
    // 同じステージへのドロップはスキップ
    if (deal.stage_id === targetStageId || (!deal.stage_id && deal.stage === targetStageId)) return;
    if (!stageIds.has(targetStageId)) return;

    const targetStage = stages.find((s) => s.id === targetStageId);
    onStageChange(dealId, targetStageId, targetStage?.probability_default ?? 0);
  };

  // 受注・失注の商談数
  const wonCount = deals.filter((d) => d.status === "won").length;
  const lostCount = deals.filter((d) => d.status === "lost").length;

  // 動的グリッドカラム数
  const gridCols =
    stages.length <= 4
      ? "grid-cols-4"
      : stages.length <= 6
        ? "grid-cols-6"
        : "grid-cols-4 lg:grid-cols-6 xl:grid-cols-8";

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`grid ${gridCols} gap-3`}>
          {stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] ?? [];
            const totalAmount = stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
            return (
              <DroppableColumn
                key={stage.id}
                stage={stage}
                count={stageDeals.length}
                totalAmount={totalAmount}
              >
                <SortableContext
                  items={stageDeals.map((d) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {stageDeals.map((deal) => (
                    <DraggableDealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => onDealClick(deal.id)}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>

        <DragOverlay>{activeDeal && <DealCardOverlay deal={activeDeal} />}</DragOverlay>
      </DndContext>

      {/* 受注・失注サマリ */}
      {(wonCount > 0 || lostCount > 0) && (
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          {wonCount > 0 && <span>受注: {wonCount}件</span>}
          {lostCount > 0 && <span>失注: {lostCount}件</span>}
        </div>
      )}
    </div>
  );
}
