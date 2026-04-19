"use client";

import { useSyncExternalStore } from "react";
import type { NavItem, NavSection } from "@hr1/shared-ui/components/layout/nav-types";
import type { Product } from "./product";
import {
  LayoutDashboard,
  Clock,
  CalendarOff,
  Receipt,
  CalendarClock,
  FileInput,
  MessageSquare,
  ListTodo,
  CalendarDays,
  FolderKanban,
  Users,
  UsersRound,
  Briefcase,
  ClipboardList,
  ListTree,
  BookOpen,
  Megaphone,
  HeartPulse,
  CircleHelp,
  Star,
  ShieldCheck,
  UserPlus,
  Building2,
  Contact,
  Handshake,
  FileText,
  BarChart3,
  Bell,
  User,
  ClipboardCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared items (used across multiple products)                       */
/* ------------------------------------------------------------------ */

const commonItems: NavItem[] = [
  { href: "/messages", label: "メッセージ", icon: MessageSquare },
  { href: "/tasks", label: "タスク", icon: ListTodo },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/announcements", label: "お知らせ", icon: Megaphone },
  { href: "/faqs", label: "よくある質問", icon: CircleHelp },
];

/* ------------------------------------------------------------------ */
/*  Sections per product                                               */
/* ------------------------------------------------------------------ */

const recruitingSections: NavSection[] = [
  {
    label: "採用",
    items: [
      { href: "/applicants", label: "候補者", icon: UsersRound },
      { href: "/applications", label: "応募", icon: ClipboardList },
      { href: "/selection-steps", label: "選考ステップ", icon: ListTree },
      { href: "/jobs", label: "求人", icon: Briefcase },
      { href: "/scheduling", label: "日程調整", icon: CalendarClock },
      { href: "/forms", label: "フォーム", icon: FileText },
      { href: "/evaluation-templates", label: "評価テンプレート", icon: ClipboardCheck },
      { href: "/recruiting-tasks", label: "応募者タスク", icon: ListTodo },
    ],
  },
  {
    label: "コラボレーション",
    items: [{ href: "/evaluation-cycles", label: "評価サイクル", icon: Star }, ...commonItems],
  },
];

const workingSections: NavSection[] = [
  {
    label: "個人",
    items: [
      { href: "/my-attendance", label: "勤怠", icon: Clock },
      { href: "/my-leave", label: "休暇", icon: CalendarOff },
      { href: "/payslips", label: "給与明細", icon: Receipt },
      { href: "/shifts", label: "シフト", icon: CalendarClock },
      { href: "/workflows", label: "各種申請", icon: FileInput },
    ],
  },
  {
    label: "コラボレーション",
    items: [
      { href: "/projects", label: "プロジェクト", icon: FolderKanban },
      { href: "/employees", label: "社員名簿", icon: Users },
      { href: "/wiki", label: "Wiki", icon: BookOpen },
      { href: "/surveys", label: "サーベイ", icon: HeartPulse },
      { href: "/evaluation-cycles", label: "評価", icon: Star },
      { href: "/compliance", label: "コンプライアンス", icon: ShieldCheck },
      ...commonItems,
    ],
  },
];

const clientSections: NavSection[] = [
  {
    label: "CRM",
    items: [
      { href: "/leads", label: "リード", icon: UserPlus },
      { href: "/companies", label: "企業", icon: Building2 },
      { href: "/contacts", label: "連絡先", icon: Contact },
      { href: "/deals", label: "商談", icon: Handshake },
      { href: "/quotes", label: "見積", icon: FileText },
      { href: "/reports/forecast", label: "レポート", icon: BarChart3 },
    ],
  },
  {
    label: "共通",
    items: commonItems,
  },
];

export const sectionsByProduct: Record<Product, NavSection[]> = {
  recruiting: recruitingSections,
  working: workingSections,
  client: clientSections,
};

export const dashboardHref = "/dashboard";

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
