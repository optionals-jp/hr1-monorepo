"use client";

import { useEffect, useState } from "react";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import type { Department } from "@/types/database";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  admin: "管理者",
  employee: "社員",
};

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "departments", label: "部署" },
];

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
  const [editPosition, setEditPosition] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile || !organization) return;
    setLoading(true);

    const [{ data: edData }, { data: allDepts }] = await Promise.all([
      getSupabase()
        .from("employee_departments")
        .select("department_id, departments(id, name)")
        .eq("user_id", profile.id),
      getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name"),
    ]);

    const depts = (edData ?? [])
      .map((row) => (row as unknown as { departments: Department }).departments)
      .filter(Boolean);
    setDepartments(depts);
    setAssignedDeptIds(depts.map((d) => d.id));
    setAllDepartments(allDepts ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile && organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, organization?.id]);

  const startEditing = () => {
    if (!profile) return;
    setEditName(profile.display_name ?? "");
    setEditPosition(profile.position ?? "");
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
        position: editPosition.trim() || null,
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
      <PageHeader title="個人情報" description="あなたのアカウント情報を管理します" />

      <PageContent>
        <div className="max-w-2xl space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 rounded-lg bg-white border px-5 py-4">
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
          </div>

          {/* Profile details */}
          <div className="rounded-lg bg-white border">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">基本情報</h2>
              <Button variant="outline" size="sm" onClick={startEditing}>
                編集
              </Button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">名前</span>
                <span>{profile.display_name ?? "-"}</span>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">登録日</span>
                <span>{format(new Date(profile.created_at), "yyyy/MM/dd")}</span>
              </div>
            </div>
          </div>
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
              <Label>名前</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="山田 太郎"
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
