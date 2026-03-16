"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  FileText,
  ClipboardList,
  Calendar,
  CalendarDays,
  Building2,
  FolderKanban,
  Clock,
  MessageSquare,
  Settings,
  ChevronDown,
  Star,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: React.ElementType }[];
}

const navSections: NavSection[] = [
  {
    label: "",
    items: [{ href: "/", label: "ダッシュボード", icon: LayoutDashboard }],
  },
  {
    label: "採用",
    items: [
      { href: "/applicants", label: "応募者一覧", icon: UserPlus },
      { href: "/jobs", label: "求人管理", icon: Briefcase },
      { href: "/applications", label: "応募管理", icon: ClipboardList },
      { href: "/scheduling", label: "日程調整", icon: Calendar },
    ],
  },
  {
    label: "社内",
    items: [
      { href: "/employees", label: "社員一覧", icon: Users },
      { href: "/departments", label: "部署管理", icon: Building2 },
      { href: "/projects", label: "プロジェクト", icon: FolderKanban },
      { href: "/attendance", label: "勤怠管理", icon: Clock },
    ],
  },
  {
    label: "共通",
    items: [
      { href: "/tasks", label: "タスク", icon: ListTodo },
      { href: "/messages", label: "メッセージ", icon: MessageSquare },
      { href: "/calendar", label: "カレンダー", icon: CalendarDays },
      { href: "/forms", label: "フォーム管理", icon: FileText },
      { href: "/evaluations", label: "評価管理", icon: Star },
    ],
  },
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
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
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

function CollapsibleSection({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasActiveItem = section.items.some(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
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

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full py-3 px-2 overflow-y-auto">
      <div className="flex-1 space-y-4">
        {navSections.map((section) =>
          section.label ? (
            <CollapsibleSection
              key={section.label}
              section={section}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ) : (
            <div key="_top" className="space-y-0.5">
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
            </div>
          )
        )}
      </div>
      <div className="border-t pt-2 mt-2 space-y-0.5">
        <NavLink
          href="/settings"
          label="設定"
          icon={Settings}
          pathname={pathname}
          onNavigate={onNavigate}
        />
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
