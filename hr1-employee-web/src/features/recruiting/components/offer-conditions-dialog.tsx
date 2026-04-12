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
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";

interface OfferConditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    salary?: string;
    start_date?: string;
    department?: string;
    notes?: string;
    expires_at?: string;
  }) => Promise<void>;
}

export function OfferConditionsDialog({
  open,
  onOpenChange,
  onSubmit,
}: OfferConditionsDialogProps) {
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        salary: salary || undefined,
        start_date: startDate || undefined,
        department: department || undefined,
        notes: notes || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>内定条件の入力</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="salary">年収・給与</Label>
            <Input
              id="salary"
              placeholder="例: 年収500万円"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start-date">入社予定日</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department">配属先</Label>
            <Input
              id="department"
              placeholder="例: 開発部"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expires-at">回答期限</Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              placeholder="その他条件やメモ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "処理中..." : "内定にする"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
