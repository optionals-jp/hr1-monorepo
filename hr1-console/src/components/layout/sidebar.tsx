"use client";

import React, { useSyncExternalStore } from "react";
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
  Settings,
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
  Zap,
  Mail,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { NavLink } from "@hr1/shared-ui/components/layout/nav-link";
import { CollapsibleSection } from "@hr1/shared-ui/components/layout/collapsible-section";
import { SidebarShell } from "@hr1/shared-ui/components/layout/sidebar-shell";
import { usePermission } from "@/lib/hooks/use-permission";

/** sidebar 内部用のエイリアス（usePermission を直接呼ぶとコンポーネント名と紛らわしいため） */
const usePermissionSidebar = usePermission;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProductTab = "recruiting" | "workspace" | "client";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  resource?: string;
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Unified navigation sections                                        */
/* ------------------------------------------------------------------ */

const unifiedSections: NavSection[] = [
  {
    labelKey: "nav.section.recruitment",
    items: [
      { href: "/applicants", labelKey: "nav.applicants", icon: UserPlus, resource: "applicants" },
      { href: "/jobs", labelKey: "nav.jobs", icon: Briefcase, resource: "jobs" },
      {
        href: "/applications",
        labelKey: "nav.applications",
        icon: ClipboardList,
        resource: "applications",
      },
      { href: "/scheduling", labelKey: "nav.scheduling", icon: Calendar, resource: "scheduling" },
      { href: "/forms", labelKey: "nav.forms", icon: FileText, resource: "forms" },
    ],
  },
  {
    labelKey: "nav.section.internal",
    items: [
      { href: "/employees", labelKey: "nav.employees", icon: Users, resource: "employees" },
      {
        href: "/departments",
        labelKey: "nav.departments",
        icon: Building2,
        resource: "departments",
      },
      { href: "/attendance", labelKey: "nav.attendance", icon: Clock, resource: "attendance" },
      { href: "/shifts", labelKey: "nav.shifts", icon: CalendarRange, resource: "shifts" },
      { href: "/workflows", labelKey: "nav.workflows", icon: FileCheck, resource: "workflows" },
      { href: "/leave", labelKey: "nav.leave", icon: CalendarOff, resource: "leave" },
      { href: "/payslips", labelKey: "nav.payslips", icon: Receipt, resource: "payslips" },
    ],
  },
  {
    labelKey: "nav.section.crm",
    items: [
      {
        href: "/crm/settings/pipelines",
        labelKey: "nav.crm.pipelines",
        icon: Settings,
        resource: "crm.settings",
      },
      {
        href: "/crm/settings/fields",
        labelKey: "nav.crm.fields",
        icon: Settings,
        resource: "crm.settings",
      },
      {
        href: "/crm/settings/automations",
        labelKey: "nav.crm.automations",
        icon: Zap,
        resource: "crm.settings",
      },
      {
        href: "/crm/settings/email-templates",
        labelKey: "nav.crm.emailTemplates",
        icon: Mail,
        resource: "crm.settings",
      },
      {
        href: "/crm/settings/webhooks",
        labelKey: "nav.crm.webhooks",
        icon: Webhook,
        resource: "crm.settings",
      },
    ],
  },
  {
    labelKey: "nav.section.common",
    items: [
      { href: "/evaluations", labelKey: "nav.evaluations", icon: Star, resource: "evaluations" },
      { href: "/projects", labelKey: "nav.projects", icon: FolderKanban, resource: "projects" },
      { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo, resource: "tasks" },
      { href: "/surveys", labelKey: "nav.surveys", icon: HeartPulse, resource: "surveys" },
      { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, resource: "calendar" },
      {
        href: "/announcements",
        labelKey: "nav.announcements",
        icon: Megaphone,
        resource: "announcements",
      },
      { href: "/faqs", labelKey: "nav.faqs", icon: CircleHelp, resource: "faqs" },
      { href: "/wiki", labelKey: "nav.wiki", icon: BookOpen, resource: "wiki" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Dashboard tab (used only by dashboard settings page)               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "hr1-product-tab";

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

export function saveDashboardTab(tab: ProductTab) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, tab);
    emitTabChange();
  }
}

export function useDashboardTab(): ProductTab {
  return useSyncExternalStore(subscribeTab, getTabSnapshot, getTabServerSnapshot);
}

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
  const { can } = usePermissionSidebar();
  const sections = unifiedSections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.resource || can(item.resource, "view")),
    }))
    .filter((s) => s.items.length > 0);

  const resolvedSections = sections.map((s) => ({
    label: t(s.labelKey),
    items: s.items.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
      icon: item.icon,
      resource: item.resource,
    })),
  }));

  return (
    <nav className={cn("flex flex-col h-full py-3 overflow-y-auto", collapsed ? "px-1" : "px-2")}>
      <div className="flex-1 space-y-4">
        {/* ダッシュボード（常にトップ） */}
        <div className="space-y-0.5">
          <NavLink
            href="/"
            label={t("nav.dashboard")}
            icon={LayoutDashboard}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        </div>

        {/* 統合セクション */}
        {resolvedSections.map((section) => (
          <CollapsibleSection
            key={section.label}
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
        {can("compliance", "view") && (
          <NavLink
            href="/compliance"
            label={t("nav.compliance")}
            icon={ShieldAlert}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        )}
        {can("audit-logs", "view") && (
          <NavLink
            href="/audit-logs"
            label={t("nav.auditLogs")}
            icon={ShieldCheck}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        )}
        <NavLink
          href="/settings"
          label={t("nav.settings")}
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
    <SidebarShell collapsed={collapsed} onToggleCollapse={toggleSidebarCollapsed}>
      <SidebarNav collapsed={collapsed} />
    </SidebarShell>
  );
}
