"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { EditPanel, type EditPanelTab } from "@hr1/shared-ui/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useProfileSettings } from "@/lib/hooks/use-profile-settings";
import { genderLabels } from "@/lib/constants";
import { format, differenceInYears, differenceInMonths } from "date-fns";

const roleLabels: Record<string, string> = {
  admin: "管理者",
  employee: "社員",
};

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "personal", label: "個人情報" },
  { value: "departments", label: "部署" },
];

function calcAge(birthDate: string | null): string {
  if (!birthDate) return "-";
  const age = differenceInYears(new Date(), new Date(birthDate));
  return `${age}歳`;
}

function calcTenure(hireDate: string | null): string {
  if (!hireDate) return "-";
  const now = new Date();
  const hire = new Date(hireDate);
  const years = differenceInYears(now, hire);
  const months = differenceInMonths(now, hire) % 12;
  if (years === 0) return `${months}ヶ月`;
  if (months === 0) return `${years}年`;
  return `${years}年${months}ヶ月`;
}

export default function ProfileSettingsPage() {
  const h = useProfileSettings();

  const displayName = h.profile?.display_name || h.profile?.email || "";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";

  if (!h.profile || h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="個人情報"
        description="あなたのアカウント情報を管理します"
        sticky={false}
        border={false}
      />

      <PageContent>
        <div className="max-w-2xl space-y-4">
          {/* Avatar */}
          <SectionCard>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-purple-600 text-white text-xl font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">{h.profile.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {roleLabels[h.profile.role] ?? h.profile.role}
                </Badge>
              </div>
            </div>
          </SectionCard>

          {/* 基本情報 */}
          <SectionCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>
              <Button variant="outline" size="sm" onClick={h.startEditing}>
                編集
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">氏名</span>
                <span>{h.profile.display_name ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">氏名（カナ）</span>
                <span>{h.profile.name_kana ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">メールアドレス</span>
                <span>{h.profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">役職</span>
                <span>{h.profile.position ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">部署</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {h.departments.length === 0 ? (
                    <span>-</span>
                  ) : (
                    h.departments.map((d) => (
                      <Badge key={d.id} variant="secondary">
                        {d.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ロール</span>
                <span>{roleLabels[h.profile.role] ?? h.profile.role}</span>
              </div>
            </div>
          </SectionCard>

          {/* 個人情報 */}
          <SectionCard>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">個人情報</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">生年月日</span>
                <span>
                  {h.profile.birth_date
                    ? `${format(new Date(h.profile.birth_date), "yyyy/MM/dd")}（${calcAge(h.profile.birth_date)}）`
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">性別</span>
                <span>
                  {h.profile.gender ? (genderLabels[h.profile.gender] ?? h.profile.gender) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">入社日</span>
                <span>
                  {h.profile.hire_date
                    ? `${format(new Date(h.profile.hire_date), "yyyy/MM/dd")}（勤続${calcTenure(h.profile.hire_date)}）`
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">電話番号</span>
                <span>{h.profile.phone ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">現住所</span>
                <span className="text-right max-w-[60%]">
                  {[
                    h.profile.current_postal_code && `〒${h.profile.current_postal_code}`,
                    h.profile.current_prefecture,
                    h.profile.current_city,
                    h.profile.current_street_address,
                    h.profile.current_building,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">住民票住所</span>
                <span className="text-right max-w-[60%]">
                  {[
                    h.profile.registered_postal_code && `〒${h.profile.registered_postal_code}`,
                    h.profile.registered_prefecture,
                    h.profile.registered_city,
                    h.profile.registered_street_address,
                    h.profile.registered_building,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">登録日</span>
                <span>{format(new Date(h.profile.created_at), "yyyy/MM/dd")}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageContent>

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="個人情報を編集"
        tabs={editTabs}
        activeTab={h.editTab}
        onTabChange={h.setEditTab}
        onSave={h.saveEdit}
        saving={h.saving}
      >
        {h.editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={h.editName}
                onChange={(e) => h.setEditName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label>氏名（カナ）</Label>
              <Input
                value={h.editNameKana}
                onChange={(e) => h.setEditNameKana(e.target.value)}
                placeholder="ヤマダ タロウ"
              />
            </div>
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input value={h.profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={h.editPosition}
                onChange={(e) => h.setEditPosition(e.target.value)}
                placeholder="エンジニア"
              />
            </div>
          </div>
        )}
        {h.editTab === "personal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input
                type="date"
                value={h.editBirthDate}
                onChange={(e) => h.setEditBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <Select value={h.editGender} onValueChange={(v) => v && h.setEditGender(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください">
                    {(v: string) => (v ? (genderLabels[v] ?? v) : "選択してください")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(genderLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>入社日</Label>
              <Input
                type="date"
                value={h.editHireDate}
                onChange={(e) => h.setEditHireDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={h.editPhone}
                onChange={(e) => h.setEditPhone(e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-semibold">現住所</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">郵便番号</Label>
                  <Input
                    value={h.editCurrentPostalCode}
                    onChange={(e) => h.setEditCurrentPostalCode(e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={h.editCurrentPrefecture}
                    onChange={(e) => h.setEditCurrentPrefecture(e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={h.editCurrentCity}
                  onChange={(e) => h.setEditCurrentCity(e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={h.editCurrentStreetAddress}
                  onChange={(e) => h.setEditCurrentStreetAddress(e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={h.editCurrentBuilding}
                  onChange={(e) => h.setEditCurrentBuilding(e.target.value)}
                  placeholder="○○ビル 3F"
                />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Label className="text-muted-foreground text-xs font-semibold">住民票住所</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">郵便番号</Label>
                  <Input
                    value={h.editRegisteredPostalCode}
                    onChange={(e) => h.setEditRegisteredPostalCode(e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={h.editRegisteredPrefecture}
                    onChange={(e) => h.setEditRegisteredPrefecture(e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={h.editRegisteredCity}
                  onChange={(e) => h.setEditRegisteredCity(e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={h.editRegisteredStreetAddress}
                  onChange={(e) => h.setEditRegisteredStreetAddress(e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={h.editRegisteredBuilding}
                  onChange={(e) => h.setEditRegisteredBuilding(e.target.value)}
                  placeholder="○○ビル 3F"
                />
              </div>
            </div>
          </div>
        )}
        {h.editTab === "departments" && (
          <div className="space-y-3">
            {h.allDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署が登録されていません</p>
            ) : (
              h.allDepartments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={h.editDeptIds.includes(dept.id)}
                    onCheckedChange={() => h.toggleDept(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </EditPanel>
    </>
  );
}
