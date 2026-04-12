"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@hr1/shared-ui/components/ui/dialog";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";

const statusOptions: { value: string; label: string }[] = [
  { value: "active", label: "選考中" },
  { value: "offered", label: "内定" },
  { value: "withdrawn", label: "辞退" },
];

interface BulkStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: string) => Promise<void>;
  count: number;
}

export function BulkStatusChangeDialog({
  open,
  onOpenChange,
  onSubmit,
  count,
}: BulkStatusChangeDialogProps) {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!status) return;
    setSubmitting(true);
    try {
      await onSubmit(status);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>一括ステータス変更</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{count}件の応募のステータスを変更します。</p>
          <div className="space-y-1.5">
            <Label>変更先ステータス</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !status}>
            {submitting ? "処理中..." : "変更する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
