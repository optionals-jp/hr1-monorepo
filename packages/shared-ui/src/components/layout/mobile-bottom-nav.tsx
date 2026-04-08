"use client";

import React from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import type { MobileTab } from "./nav-types";

export function MobileBottomNav({
  tabs,
  pathname,
}: {
  tabs: MobileTab[];
  pathname: string;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-white md:hidden">
      <div className="flex items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
                isActive
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
