"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/hooks/use-permission";

interface SettingsItem {
  href: string;
  label: string;
  resource?: string;
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
      { href: "/settings/organization", label: "組織情報", resource: "settings.organization" },
      { href: "/settings/skills", label: "スキルマスタ", resource: "settings.skills" },
      {
        href: "/settings/certifications",
        label: "資格マスタ",
        resource: "settings.certifications",
      },
      { href: "/settings/home-design", label: "アプリのホームデザイン" },
      {
        href: "/settings/recruiting-targets",
        label: "採用目標",
        resource: "settings.recruiting-targets",
      },
      { href: "/settings/members", label: "メンバー管理", resource: "settings.members" },
      { href: "/settings/permission-groups", label: "権限グループ", resource: "settings.members" },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const { can } = usePermission();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of settingsSections) {
      for (const item of section.items) {
        if (item.children && pathname.startsWith(item.href)) {
          initial.add(item.href);
        }
      }
    }
    return initial;
  });

  const filteredSections = settingsSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.resource || can(item.resource, "view")),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="hidden md:flex sticky top-0 h-dvh w-56 shrink-0 flex-col border-r border-border bg-white z-30">
      <div className="px-3 py-3 border-b">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Link>
        <h1 className="text-sm font-semibold text-foreground">設定</h1>
      </div>
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {filteredSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isParentActive = pathname.startsWith(item.href);
                const isExactActive = !item.children && pathname.startsWith(item.href);
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
                          "relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-[14px] transition-all duration-200",
                          isParentActive
                            ? "bg-primary/8 font-semibold text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
                                  "relative flex items-center rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200",
                                  isChildActive
                                    ? "bg-primary/8 font-medium text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
                      "relative flex items-center rounded-lg px-3 py-2 text-[14px] transition-all duration-200",
                      isExactActive
                        ? "bg-primary/8 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
  );
}
