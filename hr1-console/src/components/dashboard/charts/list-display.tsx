"use client";

import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListItem {
  id: string;
  href?: string;
  title: string;
  subtitle?: string;
  values: { label: string; value: string | number; color?: string }[];
}

export interface ListDisplayProps {
  items: ListItem[];
  emptyIcon?: React.ElementType;
  emptyMessage?: string;
  maxItems?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function ListDisplay({
  items,
  emptyIcon: EmptyIcon = Inbox,
  emptyMessage = "データがありません",
  maxItems,
  viewAllHref,
  viewAllLabel = "すべて表示",
}: ListDisplayProps) {
  const visibleItems = maxItems ? items.slice(0, maxItems) : items;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-muted-foreground">
        <EmptyIcon className="h-6 w-6 mb-2 opacity-30" />
        <p className="text-[13px]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {visibleItems.map((item) => {
        const content = (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
              )}
            </div>
            {item.values.map((v, vi) => (
              <div key={`${v.label}-${vi}`} className="text-right shrink-0">
                <p className={cn("text-[13px] font-bold tabular-nums", v.color)}>{v.value}</p>
                <p className="text-[10px] text-muted-foreground">{v.label}</p>
              </div>
            ))}
          </>
        );

        return item.href ? (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 py-3 border-b border-border/40 last:border-0 transition-colors hover:bg-accent/30 -mx-5 px-5"
          >
            {content}
            <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
          </Link>
        ) : (
          <div
            key={item.id}
            className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 -mx-5 px-5"
          >
            {content}
          </div>
        );
      })}
      {viewAllHref && items.length > (maxItems ?? items.length) && (
        <div className="pt-3 text-center">
          <Link href={viewAllHref} className="text-[13px] font-medium text-primary hover:underline">
            {viewAllLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
