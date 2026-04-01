"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChevronBar } from "@/components/crm/stage-chevrons";
import type { CrmPipelineStage } from "@/types/database";

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: CrmPipelineStage[];
  currentIndex: number;
  currentStageName: string;
  status: "open" | "won" | "lost";
  onStageChange: (stageId: string, stageName: string, probability: number) => Promise<void>;
}

export function StageChangeDialog({
  open,
  onOpenChange,
  stages,
  currentIndex,
  currentStageName,
  status,
  onStageChange,
}: StageChangeDialogProps) {
  const [saving, setSaving] = useState(false);

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < stages.length - 1;

  const handleMove = async (direction: "back" | "forward") => {
    const nextIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= stages.length) return;
    const target = stages[nextIndex];
    setSaving(true);
    try {
      await onStageChange(target.id, target.name, target.probability_default);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStageClick = async (stage: CrmPipelineStage) => {
    setSaving(true);
    try {
      await onStageChange(stage.id, stage.name, stage.probability_default);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ステージ変更</DialogTitle>
          <DialogDescription>
            現在: {currentIndex >= 0 ? stages[currentIndex].name : currentStageName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <ChevronBar
            stages={stages}
            currentIndex={currentIndex}
            status={status}
            onStageClick={handleStageClick}
          />

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              disabled={!canGoBack || saving}
              onClick={() => handleMove("back")}
            >
              <ChevronLeft className="size-4 mr-1" />
              {canGoBack ? stages[currentIndex - 1].name : "前のステージ"}
            </Button>
            <Button disabled={!canGoForward || saving} onClick={() => handleMove("forward")}>
              {canGoForward ? stages[currentIndex + 1].name : "次のステージ"}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
