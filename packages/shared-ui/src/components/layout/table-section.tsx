import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface TableSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * テーブルを囲む共通レイアウトコンポーネント。
 * 白背景 + 左右パディング + flex-1 で画面下部まで埋める。
 */
export function TableSection({ children, className }: TableSectionProps) {
  return (
    <div className={cn("flex-1 bg-white px-4 sm:px-6 md:px-8 pt-2 pb-4", className)}>
      {children}
    </div>
  );
}
