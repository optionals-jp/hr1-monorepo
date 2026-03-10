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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Profile } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "hiring", label: "採用区分" },
];

export default function ApplicantsPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newHiringType, setNewHiringType] = useState<string>("");
  const [newGradYear, setNewGradYear] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const {
    data: applicants = [],
    isLoading,
    mutate,
  } = useQuery<Profile[]>(organization ? `applicants-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("user_organizations")
      .select("profiles(*)")
      .eq("organization_id", organization!.id)
      .eq("profiles.role", "applicant");

    return (data ?? [])
      .map((row) => (row as unknown as { profiles: Profile }).profiles)
      .filter(Boolean);
  });

  const openAddDialog = () => {
    setNewEmail("");
    setNewName("");
    setNewHiringType("");
    setNewGradYear("");
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !newEmail) return;
    setSaving(true);

    const id = crypto.randomUUID();
    await getSupabase()
      .from("profiles")
      .insert({
        id,
        email: newEmail,
        display_name: newName || null,
        role: "applicant",
        hiring_type: newHiringType || null,
        graduation_year: newHiringType === "new_grad" && newGradYear ? Number(newGradYear) : null,
      });

    await getSupabase().from("user_organizations").insert({
      user_id: id,
      organization_id: organization.id,
    });

    setSaving(false);
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
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            応募者を追加
          </Button>
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
              <TableHead>採用区分</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
                    {applicant.hiring_type === "new_grad" ? (
                      <Badge variant="secondary">新卒（{applicant.graduation_year}年卒）</Badge>
                    ) : applicant.hiring_type === "mid_career" ? (
                      <Badge variant="outline">中途採用</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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
        title="応募者を追加"
        tabs={addTabs}
        activeTab={addTab}
        onTabChange={setAddTab}
        onSave={handleAdd}
        saving={saving}
        saveDisabled={!newEmail}
        saveLabel="追加"
      >
        {addTab === "basic" && (
          <div className="space-y-4">
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
          </div>
        )}
        {addTab === "hiring" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>採用区分</Label>
              <Select
                value={newHiringType}
                onValueChange={(v) => {
                  setNewHiringType(v ?? "");
                  if (v !== "new_grad") setNewGradYear("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未設定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_grad">新卒採用</SelectItem>
                  <SelectItem value="mid_career">中途採用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newHiringType === "new_grad" && (
              <div className="space-y-2">
                <Label>卒業年</Label>
                <Select value={newGradYear} onValueChange={(v) => setNewGradYear(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}年卒
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </EditPanel>
    </div>
  );
}
