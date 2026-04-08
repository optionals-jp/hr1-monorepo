"use client";

import { useAuth } from "@/lib/auth-context";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";

export default function ProfilePage() {
  const { profile } = useAuth();
  const displayName = profile?.display_name ?? "社員";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col">
      <PageHeader
        title="プロフィール"
        description="あなたのアカウント情報"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary text-white text-xl font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">基本情報</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">氏名</span>
                  <span>{profile?.display_name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">メールアドレス</span>
                  <span>{profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">役職</span>
                  <span>{profile?.position ?? "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
