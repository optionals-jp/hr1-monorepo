"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface QueryErrorBannerProps {
  error: Error | undefined;
  onRetry?: () => void;
}

export function QueryErrorBanner({ error, onRetry }: QueryErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">データの取得に失敗しました</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-7">
          <RefreshCw className="mr-1 h-3 w-3" />
          再試行
        </Button>
      )}
    </div>
  );
}
