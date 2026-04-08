"use client";

import React from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const isActive =
    href === "/" || href === "/crm" ? pathname === href : pathname.startsWith(href);

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-lg transition-all duration-200",
        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
        isActive
          ? "bg-primary/8 font-semibold text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.75 rounded-r-full bg-primary" />
      )}
      {isActive && collapsed && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.75 rounded-t-full bg-primary" />
      )}
      <Icon
        className={cn(
          "h-4.5 w-4.5 shrink-0 transition-all duration-200",
          isActive ? "text-primary" : "group-hover:scale-110"
        )}
      />
      {!collapsed && (
        <span className="text-[14px] transition-transform duration-200 group-hover:translate-x-0.5">
          {label}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
