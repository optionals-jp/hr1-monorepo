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
import { Badge } from "@/components/ui/badge";
import { dealStageLabels, dealStageProbability } from "@/lib/constants";
import type { BcDeal } from "@/types/database";

const STAGE_ORDER = ["initial", "proposal", "negotiation", "closing"] as const;

const STAGE_COLORS: Record<string, string> = {
  initial: "border-t-blue-400",
  proposal: "border-t-yellow-400",
  negotiation: "border-t-orange-400",
  closing: "border-t-green-400",
};

interface DealKanbanProps {
  deals: BcDeal[];
  onStageChange: (dealId: string, newStage: string, newProbability: number) => void;
  onDealClick: (dealId: string) => void;
}

function DroppableColumn({
  stage,
  children,
  count,
  totalAmount,
}: {
  stage: string;
  children: React.ReactNode;
  count: number;
  totalAmount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg bg-muted/50 border-t-4 min-h-[400px]",
        STAGE_COLORS[stage],
        isOver && "ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">{dealStageLabels[stage] ?? stage}</h3>
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

export function DealKanban({ deals, onStageChange, onDealClick }: DealKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<BcDeal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const dealsByStage = STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage && d.status === "open");
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
    const targetStage = over.id as string;

    if (!deal || deal.stage === targetStage) return;
    if (!STAGE_ORDER.includes(targetStage as (typeof STAGE_ORDER)[number])) return;

    onStageChange(dealId, targetStage, dealStageProbability[targetStage] ?? 0);
  };

  // 受注・失注の商談数
  const wonCount = deals.filter((d) => d.status === "won").length;
  const lostCount = deals.filter((d) => d.status === "lost").length;

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-3">
          {STAGE_ORDER.map((stage) => {
            const stageDeals = dealsByStage[stage] ?? [];
            const totalAmount = stageDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
            return (
              <DroppableColumn
                key={stage}
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
