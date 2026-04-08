"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import { Input } from "@hr1/shared-ui/components/ui/input";

interface ConvertEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hireDate: string;
  onHireDateChange: (date: string) => void;
  converting: boolean;
  onConvert: () => void;
}

export function ConvertEmployeeDialog({
  open,
  onOpenChange,
  hireDate,
  onHireDateChange,
  converting,
  onConvert,
}: ConvertEmployeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>入社確定</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          この応募者を社員として登録します。プロフィールのロールが「社員」に変更され、社員アプリからログインできるようになります。
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">入社日</label>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => onHireDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={onConvert}
            disabled={converting}
            className="bg-green-600 hover:bg-green-700"
          >
            {converting ? "処理中..." : "入社確定"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
