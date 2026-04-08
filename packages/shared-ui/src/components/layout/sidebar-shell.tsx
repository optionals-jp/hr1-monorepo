"use client";

import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "../../lib/utils";

export function SidebarShell({
  collapsed,
  onToggleCollapse,
  children,
  className,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-14 h-[calc(100dvh-3.5rem)] flex-col border-r border-border bg-white shrink-0 z-20 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
        className
      )}
    >
      {children}
      <div className={cn("border-t px-2 py-2", collapsed && "px-1")}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
