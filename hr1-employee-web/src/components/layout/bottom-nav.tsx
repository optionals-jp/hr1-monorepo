"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Clock,
  MessageSquare,
  CheckSquare,
  User,
} from "lucide-react";

const navItems = [
  { label: "ホーム", icon: Home, href: "/dashboard" },
  { label: "出退勤", icon: Clock, href: "/attendance" },
  { label: "メッセージ", icon: MessageSquare, href: "/messages" },
  { label: "タスク", icon: CheckSquare, href: "/tasks" },
  { label: "プロフィール", icon: User, href: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive ? "text-primary" : ""}`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
