"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/lib/hooks/use-scrolled";

interface StickyFilterBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * sticky フィルターバーのラッパー。
 * スクロール時に下線（shadow）を表示する。
 */
export function StickyFilterBar({ children, className }: StickyFilterBarProps) {
  const scrolled = useScrolled();

  return (
    <div
      className={cn(
        "sticky top-(--header-height) z-10 bg-white transition-shadow",
        scrolled && "shadow-[0_1px_0_0_var(--color-border)]",
        className
      )}
    >
      {children}
    </div>
  );
}
