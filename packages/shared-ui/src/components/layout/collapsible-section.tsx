"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { NavLink } from "./nav-link";
import type { NavSection } from "./nav-types";

export function CollapsibleSection({
  section,
  pathname,
  onNavigate,
  collapsed,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const hasActiveItem = section.items.some(({ href }) =>
    href === "/" || href === "/crm" ? pathname === href : pathname.startsWith(href)
  );
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        <div className="mx-2 my-1 h-px bg-border" />
        {section.items.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        {section.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <>
          {section.items.map(({ href, label, icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}
      {!open && hasActiveItem && <div className="mx-3 h-0.5 rounded-full bg-primary/30" />}
    </div>
  );
}
