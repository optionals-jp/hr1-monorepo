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
  CalendarRange,
  Building2,
  FolderKanban,
  Clock,
  MessageSquare,
  Settings,
  ChevronDown,
  Star,
  ListTodo,
  CircleHelp,
  HeartPulse,
  FileCheck,
  CalendarOff,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface NavSection {
  labelKey: string;
  items: { href: string; labelKey: string; icon: React.ElementType }[];
}

const navSections: NavSection[] = [
  {
    labelKey: "",
    items: [{ href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "nav.section.recruitment",
    items: [
      { href: "/applicants", labelKey: "nav.applicants", icon: UserPlus },
      { href: "/jobs", labelKey: "nav.jobs", icon: Briefcase },
      { href: "/applications", labelKey: "nav.applications", icon: ClipboardList },
      { href: "/scheduling", labelKey: "nav.scheduling", icon: Calendar },
    ],
  },
  {
    labelKey: "nav.section.internal",
    items: [
      { href: "/employees", labelKey: "nav.employees", icon: Users },
      { href: "/departments", labelKey: "nav.departments", icon: Building2 },
      { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
      { href: "/attendance", labelKey: "nav.attendance", icon: Clock },
      { href: "/shifts", labelKey: "nav.shifts", icon: CalendarRange },
      { href: "/workflows", labelKey: "nav.workflows", icon: FileCheck },
      { href: "/leave", labelKey: "nav.leave", icon: CalendarOff },
      { href: "/payslips", labelKey: "nav.payslips", icon: Receipt },
    ],
  },
  {
    labelKey: "nav.section.common",
    items: [
      { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
      { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/forms", labelKey: "nav.forms", icon: FileText },
      { href: "/evaluations", labelKey: "nav.evaluations", icon: Star },
      { href: "/surveys", labelKey: "nav.surveys", icon: HeartPulse },
      { href: "/faqs", labelKey: "nav.faqs", icon: CircleHelp },
    ],
  },
];

function NavLink({
  href,
  labelKey,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  href: string;
  labelKey: string;
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
      {t(labelKey)}
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
        {t(section.labelKey)}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <>
          {section.items.map(({ href, labelKey, icon }) => (
            <NavLink
              key={href}
              href={href}
              labelKey={labelKey}
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
          section.labelKey ? (
            <CollapsibleSection
              key={section.labelKey}
              section={section}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ) : (
            <div key="_top" className="space-y-0.5">
              {section.items.map(({ href, labelKey, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  labelKey={labelKey}
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
          href="/audit-logs"
          labelKey="nav.auditLogs"
          icon={ShieldCheck}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/settings"
          labelKey="nav.settings"
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
