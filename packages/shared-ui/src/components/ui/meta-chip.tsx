import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";

interface MetaChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: LucideIcon;
}

/**
 * 「アイコン + 短いラベル」のメタ情報を1つ表示する小さなチップ。
 * 複数並べて、種別・属性・状態などの補足情報を簡潔に伝える用途に使う。
 */
export function MetaChip({
  icon: Icon,
  className,
  children,
  ...props
}: MetaChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-foreground",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * MetaChip を横並びにラップするコンテナ。折り返し対応。
 */
export function MetaChipGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      {...props}
    />
  );
}
