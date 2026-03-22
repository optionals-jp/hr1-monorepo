"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Search, HelpCircle, ChevronDown, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar";

export function Header() {
  const { organization, organizations, setOrganization } = useOrg();
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: pendingCount } = useQuery(
    organization ? `header-pending-${organization.id}` : null,
    async () => {
      const { count } = await getSupabase()
        .from("workflow_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .eq("status", "pending");
      return count ?? 0;
    }
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, [signOut, router]);

  const displayName = profile?.display_name || profile?.email || "ユーザー";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";
  const roleLabel = profile?.role === "admin" ? "管理者" : "社員";

  return (
    <>
      <header className="sticky top-0 flex h-14 items-center gap-2 sm:gap-4 border-b border-border bg-white px-3 sm:px-4 shrink-0 shadow-sm z-30">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-9 w-9 p-0 shrink-0"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 shrink-0 pr-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded bg-red-600">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="hidden sm:inline text-[15px] font-medium text-foreground">
            HR1 Studio
          </span>
        </button>

        {/* Org Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 sm:gap-2 rounded-md px-1.5 sm:px-2 py-1.5 hover:bg-accent text-left transition-colors shrink-0 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold shrink-0">
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold mr-2">
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
              className="h-9 pl-9 rounded-full border-border bg-accent/50 focus:bg-white focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="hidden sm:flex h-9 w-9 p-0 rounded-full">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full relative"
            onClick={() => router.push("/workflows")}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {(pendingCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingCount! > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center rounded-full ml-1 sm:ml-2 hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-purple-600 text-white text-xs font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
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
              <div className="flex h-7 w-7 items-center justify-center rounded bg-red-600">
                <span className="text-xs font-bold text-white">H</span>
              </div>
              HR1 Studio
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
