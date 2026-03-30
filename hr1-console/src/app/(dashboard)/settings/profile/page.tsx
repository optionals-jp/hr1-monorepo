"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { loadProfileSettings, saveProfileSettings } from "@/lib/hooks/use-settings";
import { genderLabels } from "@/lib/constants";
import type { Department } from "@/types/database";
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
  const { profile, refreshProfile } = useAuth();
  const { organization } = useOrg();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editName, setEditName] = useState("");
  const [editNameKana, setEditNameKana] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCurrentPostalCode, setEditCurrentPostalCode] = useState("");
  const [editCurrentPrefecture, setEditCurrentPrefecture] = useState("");
  const [editCurrentCity, setEditCurrentCity] = useState("");
  const [editCurrentStreetAddress, setEditCurrentStreetAddress] = useState("");
  const [editCurrentBuilding, setEditCurrentBuilding] = useState("");
  const [editRegisteredPostalCode, setEditRegisteredPostalCode] = useState("");
  const [editRegisteredPrefecture, setEditRegisteredPrefecture] = useState("");
  const [editRegisteredCity, setEditRegisteredCity] = useState("");
  const [editRegisteredStreetAddress, setEditRegisteredStreetAddress] = useState("");
  const [editRegisteredBuilding, setEditRegisteredBuilding] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile || !organization) return;
    setLoading(true);

    const { departments: depts, allDepartments: allDepts } = await loadProfileSettings(
      profile.id,
      organization.id
    );
    setDepartments(depts);
    setAssignedDeptIds(depts.map((d) => d.id));
    setAllDepartments(allDepts);
    setLoading(false);
  };

  useEffect(() => {
    if (profile && organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, organization?.id]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.display_name ?? "");
    setEditNameKana(profile.name_kana ?? "");
    setEditPosition(profile.position ?? "");
    setEditBirthDate(profile.birth_date ?? "");
    setEditGender(profile.gender ?? "");
    setEditHireDate(profile.hire_date ?? "");
    setEditPhone(profile.phone ?? "");
    setEditCurrentPostalCode(profile.current_postal_code ?? "");
    setEditCurrentPrefecture(profile.current_prefecture ?? "");
    setEditCurrentCity(profile.current_city ?? "");
    setEditCurrentStreetAddress(profile.current_street_address ?? "");
    setEditCurrentBuilding(profile.current_building ?? "");
    setEditRegisteredPostalCode(profile.registered_postal_code ?? "");
    setEditRegisteredPrefecture(profile.registered_prefecture ?? "");
    setEditRegisteredCity(profile.registered_city ?? "");
    setEditRegisteredStreetAddress(profile.registered_street_address ?? "");
    setEditRegisteredBuilding(profile.registered_building ?? "");
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);

    await saveProfileSettings(
      profile.id,
      {
        display_name: editName.trim() || null,
        name_kana: editNameKana.trim() || null,
        position: editPosition.trim() || null,
        birth_date: editBirthDate || null,
        gender: editGender || null,
        hire_date: editHireDate || null,
        phone: editPhone.trim() || null,
        current_postal_code: editCurrentPostalCode.trim() || null,
        current_prefecture: editCurrentPrefecture.trim() || null,
        current_city: editCurrentCity.trim() || null,
        current_street_address: editCurrentStreetAddress.trim() || null,
        current_building: editCurrentBuilding.trim() || null,
        registered_postal_code: editRegisteredPostalCode.trim() || null,
        registered_prefecture: editRegisteredPrefecture.trim() || null,
        registered_city: editRegisteredCity.trim() || null,
        registered_street_address: editRegisteredStreetAddress.trim() || null,
        registered_building: editRegisteredBuilding.trim() || null,
      },
      editDeptIds
    );

    setSaving(false);
    setEditing(false);
    await refreshProfile();
    await load();
  };

  const toggleDept = (deptId: string) => {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const displayName = profile?.display_name || profile?.email || "";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "?";

  if (!profile || loading) {
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
          <Card>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-purple-600 text-white text-xl font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {roleLabels[profile.role] ?? profile.role}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 基本情報 */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  編集
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">氏名</span>
                  <span>{profile.display_name ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">氏名（カナ）</span>
                  <span>{profile.name_kana ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">メールアドレス</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">役職</span>
                  <span>{profile.position ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">部署</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {departments.length === 0 ? (
                      <span>-</span>
                    ) : (
                      departments.map((d) => (
                        <Badge key={d.id} variant="secondary">
                          {d.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ロール</span>
                  <span>{roleLabels[profile.role] ?? profile.role}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 個人情報 */}
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">個人情報</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">生年月日</span>
                  <span>
                    {profile.birth_date
                      ? `${format(new Date(profile.birth_date), "yyyy/MM/dd")}（${calcAge(profile.birth_date)}）`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">性別</span>
                  <span>
                    {profile.gender ? (genderLabels[profile.gender] ?? profile.gender) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">入社日</span>
                  <span>
                    {profile.hire_date
                      ? `${format(new Date(profile.hire_date), "yyyy/MM/dd")}（勤続${calcTenure(profile.hire_date)}）`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">電話番号</span>
                  <span>{profile.phone ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">現住所</span>
                  <span className="text-right max-w-[60%]">
                    {[
                      profile.current_postal_code && `〒${profile.current_postal_code}`,
                      profile.current_prefecture,
                      profile.current_city,
                      profile.current_street_address,
                      profile.current_building,
                    ]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">住民票住所</span>
                  <span className="text-right max-w-[60%]">
                    {[
                      profile.registered_postal_code && `〒${profile.registered_postal_code}`,
                      profile.registered_prefecture,
                      profile.registered_city,
                      profile.registered_street_address,
                      profile.registered_building,
                    ]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">登録日</span>
                  <span>{format(new Date(profile.created_at), "yyyy/MM/dd")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="個人情報を編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={saveEdit}
        saving={saving}
      >
        {editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>氏名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label>氏名（カナ）</Label>
              <Input
                value={editNameKana}
                onChange={(e) => setEditNameKana(e.target.value)}
                placeholder="ヤマダ タロウ"
              />
            </div>
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input value={profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder="エンジニア"
              />
            </div>
          </div>
        )}
        {editTab === "personal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>性別</Label>
              <Select value={editGender} onValueChange={(v) => v && setEditGender(v)}>
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
                value={editHireDate}
                onChange={(e) => setEditHireDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-semibold">現住所</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">郵便番号</Label>
                  <Input
                    value={editCurrentPostalCode}
                    onChange={(e) => setEditCurrentPostalCode(e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={editCurrentPrefecture}
                    onChange={(e) => setEditCurrentPrefecture(e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={editCurrentCity}
                  onChange={(e) => setEditCurrentCity(e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={editCurrentStreetAddress}
                  onChange={(e) => setEditCurrentStreetAddress(e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={editCurrentBuilding}
                  onChange={(e) => setEditCurrentBuilding(e.target.value)}
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
                    value={editRegisteredPostalCode}
                    onChange={(e) => setEditRegisteredPostalCode(e.target.value)}
                    placeholder="100-0001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">都道府県</Label>
                  <Input
                    value={editRegisteredPrefecture}
                    onChange={(e) => setEditRegisteredPrefecture(e.target.value)}
                    placeholder="東京都"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">市区町村</Label>
                <Input
                  value={editRegisteredCity}
                  onChange={(e) => setEditRegisteredCity(e.target.value)}
                  placeholder="千代田区丸の内"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">番地</Label>
                <Input
                  value={editRegisteredStreetAddress}
                  onChange={(e) => setEditRegisteredStreetAddress(e.target.value)}
                  placeholder="1-1-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">建物名・部屋番号</Label>
                <Input
                  value={editRegisteredBuilding}
                  onChange={(e) => setEditRegisteredBuilding(e.target.value)}
                  placeholder="○○ビル 3F"
                />
              </div>
            </div>
          </div>
        )}
        {editTab === "departments" && (
          <div className="space-y-3">
            {allDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署が登録されていません</p>
            ) : (
              allDepartments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editDeptIds.includes(dept.id)}
                    onCheckedChange={() => toggleDept(dept.id)}
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
