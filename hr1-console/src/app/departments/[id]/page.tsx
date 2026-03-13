"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";
import type { Department } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface DeptMember {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
}

const tabs = [
  { value: "overview", label: "概要" },
  { value: "members", label: "社員" },
];

const editTabs: EditPanelTab[] = [{ value: "basic", label: "基本情報" }];

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrg();
  const [department, setDepartment] = useState<Department | null>(null);
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Editing
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organization) return;
    setLoading(true);
    const [{ data: dept }, { data: edData }] = await Promise.all([
      getSupabase()
        .from("departments")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single(),
      getSupabase()
        .from("employee_departments")
        .select("profiles:user_id(id, email, display_name, position)")
        .eq("department_id", id),
    ]);

    setDepartment(dept);

    const memberList = (edData ?? [])
      .map((row) => (row as unknown as { profiles: DeptMember }).profiles)
      .filter(Boolean);
    setMembers(memberList);

    setLoading(false);
  };

  useEffect(() => {
    if (!organization) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  const startEditing = () => {
    if (!department) return;
    setEditName(department.name);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!department || !editName.trim()) return;
    setSaving(true);
    await getSupabase()
      .from("departments")
      .update({ name: editName.trim() })
      .eq("id", department.id);
    setEditing(false);
    setSaving(false);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        部署が見つかりません
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={department.name}
        description="部署詳細"
        sticky={false}
        breadcrumb={[{ label: "部署管理", href: "/departments" }]}
      />

      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count = tab.value === "members" ? members.length : undefined;
            return (
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
                {count !== undefined && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                )}
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <div className="space-y-6 max-w-3xl">
            <section>
              <div className="rounded-lg bg-white border">
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">部署情報</h2>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    編集
                  </Button>
                </div>
                <div className="px-5 py-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">部署名</span>
                    <span className="font-medium">{department.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">社員数</span>
                    <span>{members.length} 名</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">作成日</span>
                    <span>{format(new Date(department.created_at), "yyyy/MM/dd")}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="flex-1 overflow-y-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>役職</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    この部署に所属する社員はいません
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/employees/${member.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                            {(member.display_name ?? member.email)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.display_name ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.position ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="部署情報を編集"
        tabs={editTabs}
        activeTab="basic"
        onTabChange={() => {}}
        onSave={saveEdit}
        saving={saving}
        saveDisabled={!editName.trim()}
      >
        <div className="space-y-2">
          <Label>部署名 *</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
      </EditPanel>
    </div>
  );
}
