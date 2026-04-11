"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Bell, Search, HelpCircle, Menu, LogOut, User, Check } from "lucide-react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@hr1/shared-ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@hr1/shared-ui/components/ui/sheet";
import { SidebarNav } from "./sidebar";
import { useProduct } from "@/lib/product-context";
import { PRODUCT_LABELS } from "@/lib/product";

export function AppHeader() {
  const { organization, organizations, setOrganization } = useOrg();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const product = useProduct();
  const productLabel = PRODUCT_LABELS[product];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, [signOut, router]);

  const displayName = profile?.display_name || profile?.email || "社員";
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
            onClick={() => router.push("/notifications")}
          >
            <Bell className="h-4.5 w-4.5 text-muted-foreground" />
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
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                  {roleLabel}
                </span>
              </div>
              <DropdownMenuSeparator />
              {organizations.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    所属企業
                  </div>
                  {organizations.map((org) => {
                    const isCurrent = org.id === organization?.id;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={isCurrent ? undefined : () => setOrganization(org)}
                        className={cn("gap-2", isCurrent && "bg-accent")}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold shrink-0">
                          {org.name[0]}
                        </div>
                        <span className="flex-1 truncate text-sm">{org.name}</span>
                        {isCurrent && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => router.push("/profile")}>
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
              {productLabel}
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
