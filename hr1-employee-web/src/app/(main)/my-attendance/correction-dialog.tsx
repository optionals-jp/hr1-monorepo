"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import type { AttendanceRecord } from "@/types/database";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  onSubmit: (data: {
    record_id: string;
    original_clock_in: string | null;
    original_clock_out: string | null;
    requested_clock_in: string | null;
    requested_clock_out: string | null;
    reason: string;
  }) => Promise<void>;
}

function toTimeValue(isoString: string | null): string {
  if (!isoString) return "";
  return format(new Date(isoString), "HH:mm");
}

export function CorrectionDialog({ open, onOpenChange, record, onSubmit }: CorrectionDialogProps) {
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // recordが変わったらフォームをリセット
  const resetForm = () => {
    setClockIn(record ? toTimeValue(record.clock_in) : "");
    setClockOut(record ? toTimeValue(record.clock_out) : "");
    setReason("");
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      resetForm();
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!record || !reason.trim()) return;
    setSubmitting(true);
    try {
      const datePrefix = record.date;
      await onSubmit({
        record_id: record.id,
        original_clock_in: record.clock_in,
        original_clock_out: record.clock_out,
        requested_clock_in: clockIn ? `${datePrefix}T${clockIn}:00` : null,
        requested_clock_out: clockOut ? `${datePrefix}T${clockOut}:00` : null,
        reason: reason.trim(),
      });
      onOpenChange(false);
    } catch (e) {
      console.error("補正申請エラー:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>勤怠補正申請</DialogTitle>
          <DialogDescription>
            {format(new Date(record.date), "yyyy年M月d日 (E)", { locale: ja })} の記録を修正します
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="correction-clock-in">出勤時刻</Label>
            <input
              id="correction-clock-in"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correction-clock-out">退勤時刻</Label>
            <input
              id="correction-clock-out"
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correction-reason">修正理由（必須）</Label>
            <textarea
              id="correction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="修正理由を入力してください"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!reason.trim() || submitting}>
              {submitting ? "申請中..." : "申請"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
