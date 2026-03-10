"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import type { Profile, Department } from "@/types/database";
import { Pencil } from "lucide-react";
import { format } from "date-fns";

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "departments", label: "部署" },
];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: edData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
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

    // Fetch all departments for the org
    if (organization) {
      const { data: allDepts } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      setAllDepartments(allDepts ?? []);
    }

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
    setEditPosition(profile.position ?? "");
    setEditDeptIds([...assignedDeptIds]);
    setEditTab("basic");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        display_name: editName.trim() || null,
        position: editPosition.trim() || null,
      })
      .eq("id", profile.id);

    await supabase.from("employee_departments").delete().eq("user_id", profile.id);
    if (editDeptIds.length > 0) {
      await supabase
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
      />

      <PageContent>
        <div className="max-w-2xl">
          <div className="rounded-lg bg-white border">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">プロフィール</h2>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-1 h-4 w-4" />
                編集
              </Button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">名前</span>
                <span>{profile.display_name ?? "-"}</span>
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
              <Label>名前</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="山田 太郎"
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
