"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@hr1/shared-ui/components/ui/avatar";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Camera } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { getSupabase } from "@/lib/supabase/browser";
import * as profileRepo from "@/lib/repositories/profile-repository";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUpload() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const displayName = profile?.display_name ?? "?";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("ファイルサイズは5MB以下にしてください", "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("画像ファイルを選択してください", "error");
      return;
    }

    setUploading(true);
    try {
      await profileRepo.uploadAvatar(getSupabase(), user.id, file);
      await refreshProfile();
      showToast("アバターを更新しました");
    } catch (e) {
      console.error("Failed to upload avatar:", e);
      showToast("アップロードに失敗しました", "error");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
          <AvatarFallback className="bg-primary text-white text-xl font-medium">
            {displayName[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4 mr-1" />
          {uploading ? "アップロード中..." : "写真を変更"}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG（5MB以下）</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
