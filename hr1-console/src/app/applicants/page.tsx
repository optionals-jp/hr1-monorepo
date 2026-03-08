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

export default function ApplicantsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const { data: applicants = [], isLoading, mutate } = useQuery<Profile[]>(
    organization ? `applicants-${organization.id}` : null,
    async () => {
      const { data } = await supabase
        .from("user_organizations")
        .select("profiles(*)")
        .eq("organization_id", organization!.id)
        .eq("profiles.role", "applicant");

      return (data ?? [])
        .map((row) => (row as unknown as { profiles: Profile }).profiles)
        .filter(Boolean);
    }
  );

  const handleAdd = async () => {
    if (!organization || !newEmail) return;

    const id = `applicant-${Date.now()}`;
    await supabase.from("profiles").insert({
      id,
      email: newEmail,
      display_name: newName || null,
      role: "applicant",
    });

    await supabase.from("user_organizations").insert({
      user_id: id,
      organization_id: organization.id,
    });

    setNewEmail("");
    setNewName("");
    setDialogOpen(false);
    mutate();
  };

  const filtered = applicants.filter(
    (a) =>
      !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="応募者一覧"
        description="応募者の管理・招待"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              応募者を追加
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>応募者を追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>メールアドレス *</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>名前</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="山田 花子"
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

      <div className="flex items-center h-12 bg-white border-b px-4 sm:px-6 md:px-8">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="名前・メールで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent h-12"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    応募者がいません
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((applicant) => (
                  <TableRow
                    key={applicant.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/applicants/${applicant.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                            {(applicant.display_name ?? applicant.email)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{applicant.display_name ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{applicant.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">応募者</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
