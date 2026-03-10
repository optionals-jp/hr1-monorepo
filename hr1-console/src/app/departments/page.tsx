"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPanel } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Department } from "@/types/database";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function DepartmentsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const {
    data: departments = [],
    isLoading,
    mutate,
  } = useQuery<Department[]>(organization ? `departments-${organization.id}` : null, async () => {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("name");
    return data ?? [];
  });

  const openAddDialog = () => {
    setNewDeptName("");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !newDeptName.trim()) return;
    setSavingAdd(true);
    await supabase.from("departments").insert({
      id: crypto.randomUUID(),
      organization_id: organization.id,
      name: newDeptName.trim(),
    });
    setSavingAdd(false);
    setDialogOpen(false);
    mutate();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    mutate();
  };

  const startEditing = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    await supabase.from("departments").update({ name: editName.trim() }).eq("id", editingId);
    setSavingEdit(false);
    setEditingId(null);
    setEditDialogOpen(false);
    mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="部署管理"
        description="組織の部署を管理"
        action={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            部署を追加
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>部署名</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  部署がありません
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow
                  key={dept.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/departments/${dept.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">{dept.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(dept.created_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(dept);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dept.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="部署を追加"
        onSave={handleAdd}
        saving={savingAdd}
        saveDisabled={!newDeptName.trim()}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
        </div>
      </EditPanel>

      <EditPanel
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="部署名を編集"
        onSave={saveEdit}
        saving={savingEdit}
        saveDisabled={!editName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
