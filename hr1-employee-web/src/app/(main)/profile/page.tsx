"use client";

import { useAuth } from "@/lib/auth-context";
import { LogOut, User } from "lucide-react";

export default function ProfilePage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-foreground">プロフィール</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {profile?.display_name ?? "---"}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.email ?? "---"}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-3 text-sm font-medium text-destructive transition-colors hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        ログアウト
      </button>
    </div>
  );
}
