"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { getSupabase } from "@/lib/supabase/browser";
import * as profileRepo from "@/lib/repositories/profile-repository";
import { AvatarUpload } from "./avatar-upload";

export function ProfileEditForm({ onClose }: { onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [nameKana, setNameKana] = useState(profile?.name_kana ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [gender, setGender] = useState(profile?.gender ?? "");

  const hasChanges =
    displayName !== (profile?.display_name ?? "") ||
    nameKana !== (profile?.name_kana ?? "") ||
    phone !== (profile?.phone ?? "") ||
    position !== (profile?.position ?? "") ||
    birthDate !== (profile?.birth_date ?? "") ||
    gender !== (profile?.gender ?? "");

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await profileRepo.updateMyProfile(getSupabase(), user.id, {
        display_name: displayName.trim(),
        name_kana: nameKana.trim() || null,
        phone: phone.trim() || null,
        position: position.trim() || null,
        birth_date: birthDate || null,
        gender: gender || null,
      });
      await refreshProfile();
      showToast("プロフィールを更新しました");
      onClose();
    } catch (e) {
      console.error("Failed to update profile:", e);
      showToast("更新に失敗しました", "error");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">アバター</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">基本情報の編集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">氏名 *</Label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nameKana">氏名（カナ）</Label>
            <input
              id="nameKana"
              value={nameKana}
              onChange={(e) => setNameKana(e.target.value)}
              placeholder="ヤマダ タロウ"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">電話番号</Label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="090-1234-5678"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="position">役職</Label>
            <input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">生年月日</Label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">性別</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">未設定</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>メールアドレス・部署・ロールは管理者が設定します</span>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!displayName.trim() || saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h3 className="text-sm font-semibold mb-2">編集を破棄しますか？</h3>
            <p className="text-xs text-muted-foreground mb-4">保存されていない変更が失われます。</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)}>
                編集を続ける
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowCancelConfirm(false);
                  onClose();
                }}
              >
                破棄する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
