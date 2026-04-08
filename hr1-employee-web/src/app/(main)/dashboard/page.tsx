"use client";

import { useAuth } from "@/lib/auth-context";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import {
  Clock,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  Megaphone,
  FileInput,
} from "lucide-react";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

const quickActions = [
  { label: "出退勤", icon: Clock, href: "/my-attendance", color: "bg-blue-50 text-blue-600" },
  {
    label: "メッセージ",
    icon: MessageSquare,
    href: "/messages",
    color: "bg-green-50 text-green-600",
  },
  { label: "タスク", icon: CheckSquare, href: "/tasks", color: "bg-orange-50 text-orange-600" },
  {
    label: "カレンダー",
    icon: CalendarDays,
    href: "/calendar",
    color: "bg-purple-50 text-purple-600",
  },
  { label: "お知らせ", icon: Megaphone, href: "/announcements", color: "bg-red-50 text-red-600" },
  {
    label: "各種申請",
    icon: FileInput,
    href: "/workflows",
    color: "bg-gray-50 text-gray-600",
  },
];

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${getGreeting()}、${profile?.display_name ?? "社員"}さん`}
        description="今日も一日よろしくお願いします"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </PageContent>
    </div>
  );
}
