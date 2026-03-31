"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

interface SettingsSection {
  label: string;
  items: SettingsItem[];
}

const settingsSections: SettingsSection[] = [
  {
    label: "あなたの設定",
    items: [
      { href: "/settings/profile", label: "個人情報" },
      {
        href: "/settings/dashboard",
        label: "レイアウト",
        children: [
          { href: "/settings/dashboard?tab=recruiting", label: "採用" },
          { href: "/settings/dashboard?tab=workspace", label: "ワークスペース" },
          { href: "/settings/dashboard?tab=client", label: "CRM" },
        ],
      },
    ],
  },
  {
    label: "企業の設定",
    items: [
      { href: "/settings/organization", label: "組織情報" },
      { href: "/settings/skills", label: "スキルマスタ" },
      { href: "/settings/certifications", label: "資格マスタ" },
      { href: "/settings/home-design", label: "アプリのホームデザイン" },
      { href: "/settings/recruiting-targets", label: "採用目標" },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // 現在のパスに該当する親を初期展開
    for (const section of settingsSections) {
      for (const item of section.items) {
        if (item.children && pathname.startsWith(item.href)) {
          initial.add(item.href);
        }
      }
    }
    return initial;
  });

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
                  const isParentActive = pathname.startsWith(item.href);
                  const isExactActive = !item.children && pathname === item.href;
                  const isExpanded = expandedItems.has(item.href);

                  if (item.children) {
                    return (
                      <div key={item.href}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedItems((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.href)) next.delete(item.href);
                              else next.add(item.href);
                              return next;
                            })
                          }
                          className={cn(
                            "relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                            isParentActive
                              ? "bg-accent font-medium text-foreground"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          )}
                        >
                          {item.label}
                          <ChevronDown
                            className={cn(
                              "size-3.5 shrink-0 text-muted-foreground/60 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <div className="ml-3 mt-0.5 space-y-0.5">
                            {item.children.map((child) => {
                              const isChildActive = fullPath === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    "relative flex items-center rounded-md px-3 py-1.5 text-[13px] transition-colors",
                                    isChildActive
                                      ? "bg-accent/80 font-medium text-foreground"
                                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                  )}
                                >
                                  {isChildActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.75 rounded-r-full bg-primary" />
                                  )}
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        isExactActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {isExactActive && (
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
