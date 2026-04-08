"use client";

import { useState } from "react";
import { cn } from "@hr1/shared-ui/lib/utils";
import { StageChangeDialog } from "@/components/crm/stage-change-dialog";
import type { CrmPipelineStage } from "@/types/database";

const ARROW = 10;

interface StageChevronsProps {
  stages: CrmPipelineStage[];
  currentStageId: string | null;
  currentStageName: string;
  status: "open" | "won" | "lost";
  onStageChange?: (stageId: string, stageName: string, probability: number) => Promise<void>;
}

/**
 * 矢羽を並べてパイプラインの進捗を表示する。
 * `onStageChange` を渡すとクリックでステージ変更ダイアログが開く。
 */
export function StageChevrons({
  stages,
  currentStageId,
  currentStageName,
  status,
  onStageChange,
}: StageChevronsProps) {
  const currentIndex = stages.findIndex(
    (s) => s.id === currentStageId || s.name === currentStageName
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <ChevronBar
        stages={stages}
        currentIndex={currentIndex}
        status={status}
        onClick={onStageChange ? () => setDialogOpen(true) : undefined}
      />

      {onStageChange && (
        <StageChangeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stages={stages}
          currentIndex={currentIndex}
          currentStageName={currentStageName}
          status={status}
          onStageChange={onStageChange}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// 矢羽バー（表示専用）— StageChevrons / StageChangeDialog で共用
// -------------------------------------------------------------------

interface ChevronBarProps {
  stages: CrmPipelineStage[];
  currentIndex: number;
  status: "open" | "won" | "lost";
  onClick?: () => void;
  onStageClick?: (stage: CrmPipelineStage, index: number) => void;
}

export function ChevronBar({
  stages,
  currentIndex,
  status,
  onClick,
  onStageClick,
}: ChevronBarProps) {
  const isWon = status === "won";
  const isLost = status === "lost";
  const isClosed = isWon || isLost;

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="chevron-round">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="round"
            />
            <feComposite in="SourceGraphic" in2="round" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn("flex w-full", onClick && "cursor-pointer")}
        style={{ filter: "url(#chevron-round)" }}
        onClick={onClick}
      >
        {stages.map((stage, i) => {
          const isPast = currentIndex >= 0 && i < currentIndex;
          const isCurrent = i === currentIndex;
          const isActive = isPast || isCurrent;
          const isFirst = i === 0;

          const bg = isActive
            ? isClosed
              ? isWon
                ? "bg-green-500"
                : "bg-destructive"
              : "bg-primary"
            : "bg-muted";
          const fg = isActive ? "text-white" : "text-muted-foreground";

          const clipPath = isFirst
            ? `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%)`
            : `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%, ${ARROW}px 50%)`;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center justify-center flex-1 min-w-0 py-2 text-xs font-medium transition-colors",
                bg,
                fg,
                isFirst ? "pl-3 pr-1" : "px-4",
                onStageClick && !isCurrent && "cursor-pointer hover:opacity-80"
              )}
              style={{ clipPath, marginLeft: isFirst ? 0 : -1 }}
              onClick={
                onStageClick
                  ? (e) => {
                      e.stopPropagation();
                      if (!isCurrent) onStageClick(stage, i);
                    }
                  : undefined
              }
            >
              <span className="truncate">{stage.name}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
