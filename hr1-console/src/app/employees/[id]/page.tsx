"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { EvaluationTab } from "@/components/evaluations/evaluation-tab";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useCreateMessageThread } from "@/lib/use-create-message-thread";
import { genderLabels } from "@/lib/constants";
import type { Profile, Department } from "@/types/database";

import { format, differenceInYears, differenceInMonths } from "date-fns";

const pageTabs = [
  { value: "profile", label: "プロフィール" },
  { value: "evaluations", label: "評価" },
];

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

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Editing state
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editName, setEditName] = useState("");
  const [editNameKana, setEditNameKana] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRegisteredAddress, setEditRegisteredAddress] = useState("");
  const [editCurrentAddress, setEditCurrentAddress] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { handleOpenMessage, creatingThread } = useCreateMessageThread({
    participantId: profile?.id,
    participantType: "employee",
    organizationId: organization?.id,
  });

  const load = async () => {
    if (!organization) return;
    setLoading(true);

    // まず、このユーザーが自社に所属しているか確認
    const { data: membership } = await getSupabase()
      .from("user_organizations")
      .select("user_id")
      .eq("user_id", id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (!membership) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: edData }] = await Promise.all([
      getSupabase().from("profiles").select("*").eq("id", id).single(),
      getSupabase()
        .from("employee_departments")
        .select("department_id, departments(id, name)")
        .eq("user_id", id),
    ]);

    setProfile(profileData);

    const depts = (edData ?? [])
      .map((row) => (row as unknown as { departments: Department }).departments)
      .filter(Boolean);
    setDepartments(depts);
    setAssignedDeptIds(depts.map((d) => d.id));

    const { data: allDepts } = await getSupabase()
      .from("departments")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name");
    setAllDepartments(allDepts ?? []);

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.display_name ?? "");
    setEditNameKana(profile.name_kana ?? "");
    setEditPosition(profile.position ?? "");
    setEditBirthDate(profile.birth_date ?? "");
    setEditGender(profile.gender ?? "");
    setEditHireDate(profile.hire_date ?? "");
    setEditPhone(profile.phone ?? "");
    setEditRegisteredAddress(profile.registered_address ?? "");
    setEditCurrentAddress(profile.current_address ?? "");
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);

    await getSupabase()
      .from("profiles")
      .update({
        display_name: editName.trim() || null,
        name_kana: editNameKana.trim() || null,
        position: editPosition.trim() || null,
        birth_date: editBirthDate || null,
        gender: editGender || null,
        hire_date: editHireDate || null,
        phone: editPhone.trim() || null,
        registered_address: editRegisteredAddress.trim() || null,
        current_address: editCurrentAddress.trim() || null,
      })
      .eq("id", profile.id);

    await getSupabase().from("employee_departments").delete().eq("user_id", profile.id);
    if (editDeptIds.length > 0) {
      await getSupabase()
        .from("employee_departments")
        .insert(editDeptIds.map((deptId) => ({ user_id: profile.id, department_id: deptId })));
    }

    setSaving(false);
    setEditing(false);
    await load();
  };

  const toggleDept = (deptId: string) => {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        社員が見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={profile.display_name ?? profile.email}
        description="社員詳細"
        breadcrumb={[{ label: "社員一覧", href: "/employees" }]}
        sticky={false}
        action={
          <Button size="sm" onClick={handleOpenMessage} disabled={creatingThread}>
            メッセージを送る
          </Button>
        }
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {pageTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "profile" && (
        <PageContent>
          <div className="max-w-2xl space-y-4">
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
                    <span className="text-muted-foreground">メール</span>
                    <span>{profile.email}</span>
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
                    <span className="text-muted-foreground">役職</span>
                    <span>{profile.position ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ロール</span>
                    <Badge variant="secondary">社員</Badge>
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
                    <span className="text-muted-foreground">住民票住所</span>
                    <span className="text-right max-w-[60%]">
                      {profile.registered_address ?? "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">現住所</span>
                    <span className="text-right max-w-[60%]">{profile.current_address ?? "-"}</span>
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
      )}

      {activeTab === "evaluations" && (
        <PageContent>
          <EvaluationTab targetUserId={id} targetType="employee" />
        </PageContent>
      )}

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="社員情報を編集"
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
              <Label>メール</Label>
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
            <div className="space-y-2">
              <Label>住民票住所</Label>
              <Input
                value={editRegisteredAddress}
                onChange={(e) => setEditRegisteredAddress(e.target.value)}
                placeholder="東京都渋谷区..."
              />
            </div>
            <div className="space-y-2">
              <Label>現住所</Label>
              <Input
                value={editCurrentAddress}
                onChange={(e) => setEditCurrentAddress(e.target.value)}
                placeholder="東京都渋谷区..."
              />
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
