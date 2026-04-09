"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Pencil } from "lucide-react";
import { ROLE_LABELS } from "@/lib/role-utils";
import type { ProfileRole } from "@/types/database";
import { ProfileEditForm } from "./profile-edit-form";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const displayName = profile?.display_name ?? "社員";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  if (isEditing) {
    return (
      <div className="flex flex-col">
        <PageHeader title="プロフィール編集" sticky={false} border={false} />
        <PageContent>
          <div className="max-w-2xl">
            <ProfileEditForm onClose={() => setIsEditing(false)} />
          </div>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="プロフィール"
        description="あなたのアカウント情報"
        sticky={false}
        border={false}
        action={
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            編集
          </Button>
        }
      />
      <PageContent>
        <div className="max-w-2xl space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                <AvatarFallback className="bg-primary text-white text-xl font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{displayName}</p>
                  {profile?.role && (
                    <Badge variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[profile.role as ProfileRole] ?? profile.role}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">基本情報</h2>
              <div className="space-y-3 text-sm">
                <InfoRow label="氏名" value={profile?.display_name} />
                <InfoRow label="氏名（カナ）" value={profile?.name_kana} />
                <InfoRow label="メールアドレス" value={profile?.email} />
                <InfoRow label="役職" value={profile?.position} />
                <InfoRow label="部署" value={profile?.department} />
                <InfoRow label="電話番号" value={profile?.phone} />
                <InfoRow label="生年月日" value={profile?.birth_date} />
                <InfoRow
                  label="性別"
                  value={
                    profile?.gender === "male"
                      ? "男性"
                      : profile?.gender === "female"
                        ? "女性"
                        : profile?.gender === "other"
                          ? "その他"
                          : null
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
