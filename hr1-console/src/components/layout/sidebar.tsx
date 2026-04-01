"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  ShieldAlert,
  Megaphone,
  BookOpen,
  CreditCard,
  Contact,
  Handshake,
  BarChart3,
  Zap,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProductTab = "recruiting" | "workspace" | "client";

interface NavSection {
  labelKey: string;
  items: { href: string; labelKey: string; icon: React.ElementType }[];
}

/* ------------------------------------------------------------------ */
/*  Navigation definitions per product                                 */
/* ------------------------------------------------------------------ */

const recruitingSections: NavSection[] = [
  {
    labelKey: "nav.section.recruitment",
    items: [
      { href: "/applicants", labelKey: "nav.applicants", icon: UserPlus },
      { href: "/jobs", labelKey: "nav.jobs", icon: Briefcase },
      { href: "/applications", labelKey: "nav.applications", icon: ClipboardList },
      { href: "/scheduling", labelKey: "nav.scheduling", icon: Calendar },
      { href: "/forms", labelKey: "nav.forms", icon: FileText },
    ],
  },
  {
    labelKey: "nav.section.common",
    items: [
      { href: "/evaluations", labelKey: "nav.evaluations", icon: Star },
      { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
      { href: "/announcements", labelKey: "nav.announcements", icon: Megaphone },
      { href: "/faqs", labelKey: "nav.faqs", icon: CircleHelp },
    ],
  },
];

const workspaceSections: NavSection[] = [
  {
    labelKey: "nav.section.internal",
    items: [
      { href: "/employees", labelKey: "nav.employees", icon: Users },
      { href: "/departments", labelKey: "nav.departments", icon: Building2 },
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
      { href: "/evaluations", labelKey: "nav.evaluations", icon: Star },
      { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
      { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
      { href: "/surveys", labelKey: "nav.surveys", icon: HeartPulse },
      { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/announcements", labelKey: "nav.announcements", icon: Megaphone },
      { href: "/faqs", labelKey: "nav.faqs", icon: CircleHelp },
      { href: "/wiki", labelKey: "nav.wiki", icon: BookOpen },
    ],
  },
];

const clientSections: NavSection[] = [
  {
    labelKey: "nav.section.crm",
    items: [
      { href: "/crm/leads", labelKey: "nav.crm.leads", icon: UserPlus },
      { href: "/crm/companies", labelKey: "nav.crm.companies", icon: Building2 },
      { href: "/crm/contacts", labelKey: "nav.crm.contacts", icon: Contact },
      { href: "/crm/deals", labelKey: "nav.crm.deals", icon: Handshake },
      { href: "/crm/quotes", labelKey: "nav.crm.quotes", icon: FileText },
      { href: "/crm/reports/forecast", labelKey: "nav.crm.forecast", icon: BarChart3 },
      { href: "/crm/settings/pipelines", labelKey: "nav.crm.pipelines", icon: Settings },
      { href: "/crm/settings/fields", labelKey: "nav.crm.fields", icon: Settings },
      { href: "/crm/settings/automations", labelKey: "nav.crm.automations", icon: Zap },
      { href: "/crm/settings/email-templates", labelKey: "nav.crm.emailTemplates", icon: Mail },
    ],
  },
  {
    labelKey: "nav.section.common",
    items: [
      { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
      { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
    ],
  },
];

const sectionsByTab: Record<ProductTab, NavSection[]> = {
  recruiting: recruitingSections,
  workspace: workspaceSections,
  client: clientSections,
};

export const dashboardByTab: Record<ProductTab, string> = {
  recruiting: "/",
  workspace: "/",
  client: "/",
};

/* ------------------------------------------------------------------ */
/*  Tab detection from URL path                                        */
/* ------------------------------------------------------------------ */

const RECRUITING_ONLY_PATHS = ["/applicants", "/jobs", "/applications", "/scheduling", "/forms"];
const CLIENT_ONLY_PATHS = ["/crm"];
const WORKSPACE_ONLY_PATHS = [
  "/employees",
  "/departments",
  "/attendance",
  "/shifts",
  "/workflows",
  "/leave",
  "/payslips",
  "/projects",
  "/surveys",
  "/wiki",
];
// 複数タブに存在するパス — localStorage から最後のタブを復元
const SHARED_PATHS = [
  "/messages",
  "/calendar",
  "/tasks",
  "/evaluations",
  "/announcements",
  "/faqs",
];
const STORAGE_KEY = "hr1-product-tab";

/* ---- useSyncExternalStore で localStorage を SSR 安全に共有 ---- */

const tabListeners = new Set<() => void>();
function emitTabChange() {
  tabListeners.forEach((l) => l());
}
function subscribeTab(cb: () => void) {
  tabListeners.add(cb);
  return () => {
    tabListeners.delete(cb);
  };
}
function getTabSnapshot(): ProductTab {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "recruiting" || v === "workspace" || v === "client") return v;
  return "recruiting";
}
function getTabServerSnapshot(): ProductTab {
  return "recruiting";
}

export function saveProductTab(tab: ProductTab) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, tab);
    emitTabChange();
  }
}

export function useProductTab(): ProductTab {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const savedTab = useSyncExternalStore(subscribeTab, getTabSnapshot, getTabServerSnapshot);

  // 1. URL パスで一意に判定できるルート
  if (CLIENT_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "client";
  if (RECRUITING_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "recruiting";
  if (WORKSPACE_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "workspace";

  // 2. ?product= search param（タブ切替時に付与）
  const paramProduct = searchParams.get("product");
  if (paramProduct === "recruiting" || paramProduct === "workspace" || paramProduct === "client") {
    return paramProduct;
  }

  // 3. 共通パスやダッシュボード（/）は localStorage から復元
  if (pathname === "/" || SHARED_PATHS.some((p) => pathname.startsWith(p))) {
    return savedTab;
  }

  return "recruiting";
}

export const productTabDefs: {
  value: ProductTab;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { value: "recruiting", labelKey: "nav.tab.recruiting", icon: UserPlus },
  { value: "workspace", labelKey: "nav.tab.workspace", icon: Briefcase },
  { value: "client", labelKey: "nav.tab.client", icon: Handshake },
];

/* ------------------------------------------------------------------ */
/*  Sidebar collapse state (localStorage + useSyncExternalStore)       */
/* ------------------------------------------------------------------ */

const COLLAPSE_KEY = "hr1-sidebar-collapsed";
const collapseListeners = new Set<() => void>();
function emitCollapseChange() {
  collapseListeners.forEach((l) => l());
}
function subscribeCollapse(cb: () => void) {
  collapseListeners.add(cb);
  return () => {
    collapseListeners.delete(cb);
  };
}
function getCollapseSnapshot(): boolean {
  return localStorage.getItem(COLLAPSE_KEY) === "true";
}
function getCollapseServerSnapshot(): boolean {
  return false;
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribeCollapse, getCollapseSnapshot, getCollapseServerSnapshot);
}

function toggleSidebarCollapsed() {
  const next = !getCollapseSnapshot();
  localStorage.setItem(COLLAPSE_KEY, String(next));
  emitCollapseChange();
}

/* ------------------------------------------------------------------ */
/*  NavLink / CollapsibleSection                                       */
/* ------------------------------------------------------------------ */

function NavLink({
  href,
  labelKey,
  icon: Icon,
  pathname,
  onNavigate,
  collapsed,
}: {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const isActive = href === "/" || href === "/crm" ? pathname === href : pathname.startsWith(href);

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
          {t(labelKey)}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {t(labelKey)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function CollapsibleSection({
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
        {section.items.map(({ href, labelKey, icon }) => (
          <NavLink
            key={href}
            href={href}
            labelKey={labelKey}
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

/* ------------------------------------------------------------------ */
/*  SidebarNav                                                         */
/* ------------------------------------------------------------------ */

export function SidebarNav({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const activeTab = useProductTab();
  const sections: NavSection[] = sectionsByTab[activeTab];
  const dashboardHref: string = dashboardByTab[activeTab];

  return (
    <nav className={cn("flex flex-col h-full py-3 overflow-y-auto", collapsed ? "px-1" : "px-2")}>
      <div className="flex-1 space-y-4">
        {/* ダッシュボード（常にトップ） */}
        <div className="space-y-0.5">
          <NavLink
            href={dashboardHref}
            labelKey="nav.dashboard"
            icon={activeTab === "client" ? CreditCard : LayoutDashboard}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        </div>

        {/* タブ別セクション */}
        {sections.map((section) => (
          <CollapsibleSection
            key={section.labelKey}
            section={section}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* 共通メニュー（下部固定） */}
      <div className={cn("border-t pt-2 mt-2 space-y-0.5", collapsed && "border-t-0")}>
        {collapsed && <div className="mx-2 my-1 h-px bg-border" />}
        <NavLink
          href="/compliance"
          labelKey="nav.compliance"
          icon={ShieldAlert}
          pathname={pathname}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
        <NavLink
          href="/audit-logs"
          labelKey="nav.auditLogs"
          icon={ShieldCheck}
          pathname={pathname}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
        <NavLink
          href="/settings"
          labelKey="nav.settings"
          icon={Settings}
          pathname={pathname}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>
    </nav>
  );
}

export function Sidebar() {
  const collapsed = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-14 h-[calc(100dvh-3.5rem)] flex-col border-r border-border bg-white shrink-0 z-20 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <SidebarNav collapsed={collapsed} />
      <div className={cn("border-t px-2 py-2", collapsed && "px-1")}>
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
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
