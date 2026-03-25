"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/organizations", label: "契約企業", icon: Building2 },
  { href: "/contracts", label: "契約管理", icon: FileText },
  { href: "/plans", label: "プラン管理", icon: CreditCard },
];

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors",
        isActive
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.75 rounded-r-full bg-primary" />
      )}
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full py-3 px-2 overflow-y-auto">
      <div className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex sticky top-14 h-[calc(100dvh-3.5rem)] w-56 flex-col border-r border-border bg-white shrink-0 shadow-md z-20">
      <SidebarNav />
    </aside>
  );
}
