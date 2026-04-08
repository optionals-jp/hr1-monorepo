"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@hr1/shared-ui/components/ui/sheet";
import { SidebarNav } from "./sidebar";

export function Header() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/login");
  }, [signOut, router]);

  const displayName = profile?.display_name || profile?.email || "ユーザー";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";

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
          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="hidden sm:inline text-[15px] font-medium text-foreground">
            HR1 Admin
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center rounded-full ml-1 sm:ml-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                HR1管理者
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600">
                <span className="text-xs font-bold text-white">H</span>
              </div>
              HR1 Admin
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
