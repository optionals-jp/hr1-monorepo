"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Profile } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");

  const { data: employees = [], isLoading, mutate } = useQuery<Profile[]>(
    organization ? `employees-${organization.id}` : null,
    async () => {
      const { data } = await supabase
        .from("user_organizations")
        .select("profiles(*)")
        .eq("organization_id", organization!.id)
        .eq("profiles.role", "employee");

      return (data ?? [])
        .map((row) => (row as unknown as { profiles: Profile }).profiles)
        .filter(Boolean);
    }
  );

  const handleAdd = async () => {
    if (!organization || !newEmail) return;

    const id = `employee-${Date.now()}`;
    await supabase.from("profiles").insert({
      id,
      email: newEmail,
      display_name: newName || null,
      role: "employee",
      department: newDepartment || null,
      position: newPosition || null,
    });

    await supabase.from("user_organizations").insert({
      user_id: id,
      organization_id: organization.id,
    });

    setNewEmail("");
    setNewName("");
    setNewDepartment("");
    setNewPosition("");
    setDialogOpen(false);
    mutate();
  };

  const filtered = employees.filter(
    (e) =>
      !search ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="社員一覧"
        description="社員の管理・招待"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              社員を追加
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>社員を追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>メールアドレス *</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>名前</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="田中 太郎"
                  />
                </div>
                <div className="space-y-2">
                  <Label>部署</Label>
                  <Input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="エンジニアリング"
                  />
                </div>
                <div className="space-y-2">
                  <Label>役職</Label>
                  <Input
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="マネージャー"
                  />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!newEmail}>
                  追加する
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="名前・メール・部署で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>役職</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  社員がいません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/employees/${emp.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                          {(emp.display_name ?? emp.email)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.display_name ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.department ?? "-"}</TableCell>
                  <TableCell>{emp.position ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
