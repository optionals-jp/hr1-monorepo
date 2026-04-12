"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approved" | "rejected";
  onSubmit: (comment: string | null) => Promise<void>;
}

export function ReviewDialog({ open, onOpenChange, action, onSubmit }: ReviewDialogProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(comment.trim() || null);
      setComment("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{action === "approved" ? "申請を承認" : "申請を却下"}</DialogTitle>
          <DialogDescription>
            {action === "approved"
              ? "この申請を承認します。コメントを追加できます。"
              : "この申請を却下します。却下理由を入力してください。"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={action === "approved" ? "コメント（任意）" : "却下理由（必須）"}
            required={action === "rejected"}
            rows={3}
            aria-label={action === "approved" ? "承認コメント" : "却下理由"}
            className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button
              size="sm"
              variant={action === "approved" ? "default" : "destructive"}
              onClick={handleSubmit}
              disabled={submitting || (action === "rejected" && !comment.trim())}
            >
              {submitting ? "処理中..." : action === "approved" ? "承認する" : "却下する"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
