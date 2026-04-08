"use client";

import { useAuth } from "@/lib/auth-context";
import {
  Clock,
  MessageSquare,
  CheckSquare,
  User,
} from "lucide-react";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

const quickActions = [
  {
    label: "出退勤",
    icon: Clock,
    href: "/attendance",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "メッセージ",
    icon: MessageSquare,
    href: "/messages",
    color: "bg-green-50 text-green-600",
  },
  {
    label: "タスク",
    icon: CheckSquare,
    href: "/tasks",
    color: "bg-orange-50 text-orange-600",
  },
  {
    label: "プロフィール",
    icon: User,
    href: "/profile",
    color: "bg-purple-50 text-purple-600",
  },
];

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {getGreeting()}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.display_name ?? "社員"}さん
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
            >
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
