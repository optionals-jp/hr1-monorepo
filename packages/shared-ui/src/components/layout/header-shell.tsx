"use client";

import React from "react";
import { cn } from "../../lib/utils";

export function HeaderShell({
  left,
  center,
  right,
  mobileMenuButton,
  className,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  mobileMenuButton?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-(--header-height) bg-white/80 backdrop-blur-xl border-b border-border",
        className
      )}
    >
      <div className="flex h-full items-center px-4">
        {mobileMenuButton && (
          <div className="md:hidden mr-2">{mobileMenuButton}</div>
        )}
        {left && <div className="flex items-center">{left}</div>}
        {center && (
          <div className="flex flex-1 items-center justify-center">
            {center}
          </div>
        )}
        {right && (
          <div className="ml-auto flex items-center gap-2">{right}</div>
        )}
      </div>
    </header>
  );
}
