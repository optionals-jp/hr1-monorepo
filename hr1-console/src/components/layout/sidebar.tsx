"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/applicants", label: "応募者一覧", icon: UserPlus },
  { href: "/employees", label: "社員一覧", icon: Users },
  { href: "/jobs", label: "求人管理", icon: Briefcase },
  { href: "/applications", label: "応募管理", icon: ClipboardList },
  { href: "/forms", label: "フォーム管理", icon: FileText },
  { href: "/scheduling", label: "日程調整", icon: Calendar },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
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
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-full w-56 flex-col border-r border-border bg-white shrink-0">
      <SidebarNav />
    </aside>
  );
}
