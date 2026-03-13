"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
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
import { TableEmptyState } from "@/components/ui/table-empty-state";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/ui/search-bar";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "hiring", label: "採用区分" },
];

export default function ApplicantsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [filterHiringType, setFilterHiringType] = useState<string>("all");
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

    try {
      const id = crypto.randomUUID();
      const { error: profileError } = await getSupabase()
        .from("profiles")
        .insert({
          id,
          email: newEmail,
          display_name: newName || null,
          role: "applicant",
          hiring_type: newHiringType || null,
          graduation_year: newHiringType === "new_grad" && newGradYear ? Number(newGradYear) : null,
        });
      if (profileError) throw profileError;

      const { error: orgError } = await getSupabase().from("user_organizations").insert({
        user_id: id,
        organization_id: organization.id,
      });
      if (orgError) throw orgError;

      setDialogOpen(false);
      mutate();
      showToast("応募者を追加しました");
    } catch {
      showToast("応募者の追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = applicants.filter((a) => {
    const matchesSearch =
      !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesHiringType =
      filterHiringType === "all" ||
      (filterHiringType === "none" ? !a.hiring_type : a.hiring_type === filterHiringType);
    return matchesSearch && matchesHiringType;
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="応募者一覧"
        description="応募者の管理・招待"
        border={false}
        action={<Button onClick={openAddDialog}>応募者を追加</Button>}
      />

      <SearchBar value={search} onChange={setSearch} />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {filterHiringType !== "all" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                採用区分：
                {filterHiringType === "new_grad"
                  ? "新卒"
                  : filterHiringType === "mid_career"
                    ? "中途"
                    : "未設定"}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterHiringType("all");
                  }}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto py-2">
          <DropdownMenuItem className="py-2" onClick={() => setFilterHiringType("all")}>
            <span className={cn(filterHiringType === "all" && "font-medium")}>すべて</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="py-2" onClick={() => setFilterHiringType("new_grad")}>
            <span className={cn(filterHiringType === "new_grad" && "font-medium")}>新卒</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2" onClick={() => setFilterHiringType("mid_career")}>
            <span className={cn(filterHiringType === "mid_career" && "font-medium")}>中途</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2" onClick={() => setFilterHiringType("none")}>
            <span className={cn(filterHiringType === "none" && "font-medium")}>未設定</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            <TableEmptyState
              colSpan={3}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage="応募者がいません"
            >
              {filtered.map((applicant) => (
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
              ))}
            </TableEmptyState>
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
                  <SelectValue placeholder="未設定">
                    {(v: string) =>
                      v === "new_grad" ? "新卒採用" : v === "mid_career" ? "中途採用" : v
                    }
                  </SelectValue>
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
                    <SelectValue placeholder="選択してください">
                      {(v: string) => (v ? `${v}年卒` : v)}
                    </SelectValue>
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
