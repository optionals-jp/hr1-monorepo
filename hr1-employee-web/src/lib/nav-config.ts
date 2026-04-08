"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavItem, NavSection } from "@hr1/shared-ui/components/layout/nav-types";
import {
  LayoutDashboard,
  UserPlus,
  Briefcase,
  ClipboardList,
  Calendar,
  FileText,
  Star,
  MessageSquare,
  CalendarDays,
  ListTodo,
  Megaphone,
  CircleHelp,
  FolderKanban,
  HeartPulse,
  BookOpen,
  Clock,
  CalendarOff,
  Building2,
  Contact,
  Handshake,
  BarChart3,
  Bell,
  User,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProductTab = "recruiting" | "working" | "client";

/* ------------------------------------------------------------------ */
/*  Navigation definitions per product                                 */
/* ------------------------------------------------------------------ */

const recruitingSections: NavSection[] = [
  {
    label: "採用",
    items: [
      { href: "/applicants", label: "応募者", icon: UserPlus },
      { href: "/jobs", label: "求人", icon: Briefcase },
      { href: "/applications", label: "選考", icon: ClipboardList },
      { href: "/scheduling", label: "面接日程", icon: Calendar },
      { href: "/forms", label: "フォーム", icon: FileText },
    ],
  },
  {
    label: "共通",
    items: [
      { href: "/evaluations", label: "評価", icon: Star },
      { href: "/messages", label: "メッセージ", icon: MessageSquare },
      { href: "/calendar", label: "カレンダー", icon: CalendarDays },
      { href: "/tasks", label: "タスク", icon: ListTodo },
      { href: "/announcements", label: "お知らせ", icon: Megaphone },
      { href: "/faqs", label: "よくある質問", icon: CircleHelp },
    ],
  },
];

const workingSections: NavSection[] = [
  {
    label: "業務",
    items: [
      { href: "/projects", label: "プロジェクト", icon: FolderKanban },
      { href: "/surveys", label: "サーベイ", icon: HeartPulse },
      { href: "/wiki", label: "Wiki", icon: BookOpen },
    ],
  },
  {
    label: "個人",
    items: [
      { href: "/my-attendance", label: "勤怠", icon: Clock },
      { href: "/my-leave", label: "休暇", icon: CalendarOff },
    ],
  },
  {
    label: "共通",
    items: [
      { href: "/evaluations", label: "評価", icon: Star },
      { href: "/tasks", label: "タスク", icon: ListTodo },
      { href: "/messages", label: "メッセージ", icon: MessageSquare },
      { href: "/calendar", label: "カレンダー", icon: CalendarDays },
      { href: "/announcements", label: "お知らせ", icon: Megaphone },
      { href: "/faqs", label: "よくある質問", icon: CircleHelp },
    ],
  },
];

const clientSections: NavSection[] = [
  {
    label: "CRM",
    items: [
      { href: "/crm/leads", label: "リード", icon: UserPlus },
      { href: "/crm/companies", label: "企業", icon: Building2 },
      { href: "/crm/contacts", label: "連絡先", icon: Contact },
      { href: "/crm/deals", label: "商談", icon: Handshake },
      { href: "/crm/quotes", label: "見積", icon: FileText },
      { href: "/crm/reports/forecast", label: "レポート", icon: BarChart3 },
    ],
  },
  {
    label: "共通",
    items: [
      { href: "/messages", label: "メッセージ", icon: MessageSquare },
      { href: "/calendar", label: "カレンダー", icon: CalendarDays },
      { href: "/tasks", label: "タスク", icon: ListTodo },
    ],
  },
];

export const sectionsByTab: Record<ProductTab, NavSection[]> = {
  recruiting: recruitingSections,
  working: workingSections,
  client: clientSections,
};

export const dashboardByTab: Record<ProductTab, string> = {
  recruiting: "/dashboard",
  working: "/dashboard",
  client: "/dashboard",
};

export const productTabDefs: {
  value: ProductTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "recruiting", label: "HR1 Recruiting", icon: UserPlus },
  { value: "working", label: "HR1 Working", icon: Briefcase },
  { value: "client", label: "HR1 Client", icon: Handshake },
];

/* ------------------------------------------------------------------ */
/*  Tab detection from URL path                                        */
/* ------------------------------------------------------------------ */

const RECRUITING_ONLY_PATHS = ["/applicants", "/jobs", "/applications", "/scheduling", "/forms"];
const CLIENT_ONLY_PATHS = ["/crm"];
const WORKING_ONLY_PATHS = ["/projects", "/surveys", "/wiki", "/my-attendance", "/my-leave"];
const SHARED_PATHS = [
  "/messages",
  "/calendar",
  "/tasks",
  "/evaluations",
  "/announcements",
  "/faqs",
];

const STORAGE_KEY = "hr1-employee-product-tab";

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
  if (v === "recruiting" || v === "working" || v === "client") return v;
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

  if (CLIENT_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "client";
  if (RECRUITING_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "recruiting";
  if (WORKING_ONLY_PATHS.some((p) => pathname.startsWith(p))) return "working";

  const paramProduct = searchParams.get("product");
  if (paramProduct === "recruiting" || paramProduct === "working" || paramProduct === "client") {
    return paramProduct;
  }

  if (pathname === "/dashboard" || SHARED_PATHS.some((p) => pathname.startsWith(p))) {
    return savedTab;
  }

  return "recruiting";
}

/* ------------------------------------------------------------------ */
/*  Sidebar collapse state (localStorage + useSyncExternalStore)       */
/* ------------------------------------------------------------------ */

const COLLAPSE_KEY = "hr1-employee-sidebar-collapsed";
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

export function toggleSidebarCollapsed() {
  const next = !getCollapseSnapshot();
  localStorage.setItem(COLLAPSE_KEY, String(next));
  emitCollapseChange();
}

/* ------------------------------------------------------------------ */
/*  Bottom items & dashboard icon                                      */
/* ------------------------------------------------------------------ */

export const bottomItems: NavItem[] = [
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/profile", label: "プロフィール", icon: User },
];

export const dashboardIcon = LayoutDashboard;
