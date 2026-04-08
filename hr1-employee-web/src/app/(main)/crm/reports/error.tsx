"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle className="size-10 text-destructive" />
      <h2 className="text-lg font-semibold">レポートの表示中にエラーが発生しました</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message ||
          "データの読み込みまたは計算中にエラーが発生しました。再試行してください。"}
      </p>
      <Button variant="outline" onClick={reset}>
        再試行
      </Button>
    </div>
  );
}
