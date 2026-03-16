"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSection {
  label: string;
  items: { href: string; label: string }[];
}

const settingsSections: SettingsSection[] = [
  {
    label: "あなたの設定",
    items: [{ href: "/settings/profile", label: "個人情報" }],
  },
  {
    label: "企業の設定",
    items: [
      { href: "/settings/organization", label: "組織情報" },
      { href: "/settings/skills", label: "スキルマスタ" },
      { href: "/settings/certifications", label: "資格マスタ" },
      { href: "/settings/home-design", label: "アプリのホームデザイン" },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 設定サイドバー */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Link>
          <h1 className="text-sm font-semibold text-foreground">設定</h1>
        </div>
        <nav className="flex-1 py-3 px-3">
          {settingsSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.75 rounded-r-full bg-primary" />
                      )}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* コンテンツ */}
      <div className="flex flex-col flex-1 overflow-y-auto bg-slate-50">{children}</div>
    </div>
  );
}
