"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface DealStageProgressProps {
  stages: { id: string; name: string; color: string }[];
  currentStageId: string | null;
  currentStageIndex: number;
}

export function DealStageProgress({
  stages,
  currentStageId,
  currentStageIndex,
}: DealStageProgressProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">パイプラインステージ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  "h-2 rounded-full flex-1 transition-colors",
                  stage.id === currentStageId || (currentStageIndex >= 0 && i < currentStageIndex)
                    ? "opacity-100"
                    : "opacity-20"
                )}
                style={{ backgroundColor: stage.color }}
              />
              {i < stages.length - 1 && (
                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {stages.map((stage) => (
            <span
              key={stage.id}
              className={cn(
                "text-xs flex-1 text-center",
                stage.id === currentStageId
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {stage.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
