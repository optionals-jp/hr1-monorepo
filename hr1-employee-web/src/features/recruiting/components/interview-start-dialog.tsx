"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
import { Video, ClipboardCheck } from "lucide-react";
import type { ApplicationStep } from "@/types/database";

interface InterviewStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ApplicationStep | null;
  onStart: () => void;
  onGoToEvaluation: () => void;
  saving?: boolean;
}

export function InterviewStartDialog({
  open,
  onOpenChange,
  step,
  onStart,
  onGoToEvaluation,
  saving,
}: InterviewStartDialogProps) {
  if (!step) return null;

  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title={`「${step.label}」を開始`}
      size="sm"
      footer={
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={onStart} disabled={saving}>
            {saving ? "開始中..." : "面接を開始する"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Video className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Google Meet</span>
          </div>
          <p className="text-sm text-muted-foreground">
            オンライン面接機能は準備中です。Google Meet のリンクを発行して応募者に共有してください。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open("https://meet.google.com/new", "_blank")}
          >
            Google Meet を開く
          </Button>
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">評価</span>
          </div>
          <p className="text-sm text-muted-foreground">
            面接後に評価タブから応募者を評価できます。
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={onGoToEvaluation}>
            評価タブへ移動
          </Button>
        </div>
      </div>
    </DialogPanel>
  );
}
