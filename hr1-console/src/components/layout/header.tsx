"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Bell, Search, HelpCircle, ChevronDown, Menu, LogOut, User } from "lucide-react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { usePendingCount } from "@/lib/hooks/use-header";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@hr1/shared-ui/components/ui/sheet";
import {
  SidebarNav,
  useProductTab,
  saveProductTab,
  productTabDefs,
  dashboardByTab,
} from "./sidebar";
import { t } from "@/lib/i18n";

export function Header() {
  const { organization, organizations, setOrganization } = useOrg();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: pendingCount } = usePendingCount();

  const activeProduct = useProductTab();
  const activeProductDef =
    productTabDefs.find((d) => d.value === activeProduct) ?? productTabDefs[0];

  const handleProductChange = (tab: (typeof productTabDefs)[number]["value"]) => {
    saveProductTab(tab);
    const dest = dashboardByTab[tab];
    // 共通ダッシュボード（/）では ?product= を付与して URL でタブを判別可能にする
    router.push(dest === "/" ? `/?product=${tab}` : dest);
  };

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, [signOut, router]);

  const displayName = profile?.display_name || profile?.email || "ユーザー";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";
  const roleLabel = profile?.role === "admin" ? "管理者" : "社員";

  return (
    <>
      <header className="sticky top-0 flex h-(--header-height) items-center gap-2 sm:gap-4 border-b border-border/60 bg-white/80 backdrop-blur-xl px-3 sm:px-4 shrink-0 z-30">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-9 w-9 p-0 shrink-0"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Product Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 sm:gap-2 shrink-0 rounded-md px-1.5 sm:px-2 py-1.5 hover:bg-accent text-left transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="HR1" className="h-5 shrink-0" />
            <span className="hidden sm:inline text-[18px] font-extrabold tracking-tight text-[#1C1E1E] max-w-40 truncate">
              {t(activeProductDef.labelKey)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1.5">
            {productTabDefs.map((p) => {
              const Icon = p.icon;
              return (
                <DropdownMenuItem
                  key={p.value}
                  onClick={() => handleProductChange(p.value)}
                  className={cn(
                    "group gap-3 rounded-lg px-3 py-2.5 text-[14px] cursor-pointer",
                    activeProduct === p.value && "bg-accent font-medium"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110 group-data-highlighted:scale-110" />
                  <span className="font-extrabold tracking-tight text-[#1C1E1E] transition-transform group-hover:translate-x-0.5 group-data-highlighted:translate-x-0.5">
                    {t(p.labelKey)}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Org Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 sm:gap-2 rounded-md px-1.5 sm:px-2 py-1.5 hover:bg-accent text-left transition-colors shrink-0 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold shrink-0">
              {organization?.name?.[0] ?? "?"}
            </div>
            <span className="hidden sm:inline text-[13px] font-medium text-foreground max-w-40 truncate">
              {organization?.name ?? "企業を選択"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setOrganization(org)}
                className={cn(org.id === organization?.id && "bg-accent")}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold mr-2">
                  {org.name[0]}
                </div>
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search (hidden on mobile) */}
        <div className="hidden sm:flex flex-1 justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="検索..."
              className="h-9 pl-9 rounded-full border-transparent bg-accent/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
            />
          </div>
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <HelpCircle className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => router.push("/workflows")}
          >
            <Bell className="h-4.5 w-4.5 text-muted-foreground" />
            {(pendingCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingCount! > 99 ? "99+" : pendingCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center rounded-full ml-1 sm:ml-2 transition-all duration-200 hover:ring-2 hover:ring-primary/20">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-linear-to-br from-teal-600 to-teal-800 text-white text-xs font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                  {roleLabel}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <User className="mr-2 h-4 w-4" />
                プロフィール
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="HR1" className="h-5" />
              {t(activeProductDef.labelKey)}
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
