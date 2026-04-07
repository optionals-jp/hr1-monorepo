"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@/components/layout/table-section";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EditPanel } from "@/components/ui/edit-panel";
import { useMembersPage } from "@/lib/hooks/use-members-page";
import { AlertCircle, CheckCircle2, Loader2, Mail, UserPlus, Shield } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  employee: "従業員",
};

export default function MembersSettingsPage() {
  const h = useMembersPage();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="メンバー管理"
        description="組織のメンバーを管理し、新しいメンバーを招待します"
        sticky={false}
        border={false}
        action={
          h.isAdmin ? (
            <Button onClick={h.openInvite}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              メンバーを招待
            </Button>
          ) : undefined
        }
      />

      <StickyFilterBar>
        <SearchBar value={h.search} onChange={h.setSearch} placeholder="名前・メールで検索" />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>役職</TableHead>
              <TableHead>権限</TableHead>
              <TableHead>グループ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={h.loading}
              isEmpty={h.filtered.length === 0}
              emptyMessage="メンバーがいません"
            >
              {h.filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
                          {(member.display_name ?? member.email)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.display_name ?? "-"}</span>
                        {member.id === h.currentUserId && <Badge variant="outline">あなた</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.position ?? "-"}</TableCell>
                  <TableCell>
                    {h.isAdmin && member.id !== h.currentUserId ? (
                      <Select
                        value={member.role}
                        onValueChange={(val) =>
                          h.handleRoleChange(member.id, val as "admin" | "employee")
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="employee">従業員</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.role === "admin" ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {(h.memberGroupMap[member.id] ?? []).length > 0 ? (
                          (h.memberGroupMap[member.id] ?? []).map((g) => (
                            <Badge key={g.id} variant="outline" className="text-xs">
                              {g.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">未設定</span>
                        )}
                        {h.isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => h.openGroupEdit(member.id)}
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* 招待ダイアログ */}
      <Dialog open={h.inviteOpen} onOpenChange={h.setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
            <DialogDescription>
              メールアドレスを入力して招待メールを送信します。招待されたユーザーはOTPでログインできます。
            </DialogDescription>
          </DialogHeader>

          {h.inviteSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">招待メールを送信しました</p>
              <p className="text-xs text-muted-foreground">
                {h.inviteEmail} に招待メールが届きます
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => h.setInviteOpen(false)}
                className="mt-2"
              >
                閉じる
              </Button>
            </div>
          ) : (
            <>
              {h.inviteError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{h.inviteError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>メールアドレス</Label>
                  <Input
                    type="email"
                    value={h.inviteEmail}
                    onChange={(e) => h.setInviteEmail(e.target.value)}
                    placeholder="example@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>権限</Label>
                  <Select
                    value={h.inviteRole}
                    onValueChange={(val) => h.setInviteRole(val as "admin" | "employee")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">
                        従業員 — 基本的な機能にアクセスできます
                      </SelectItem>
                      <SelectItem value="admin">管理者 — すべての機能を管理できます</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => h.setInviteOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={h.handleInvite} disabled={h.inviting || !h.inviteEmail.trim()}>
                  {h.inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1.5" />
                      招待メールを送信
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* グループ割り当てパネル */}
      <EditPanel
        open={h.groupEditOpen}
        onOpenChange={h.setGroupEditOpen}
        title="権限グループを割り当て"
        onSave={h.saveGroupAssignment}
        saving={h.groupSaving}
      >
        <div className="space-y-3">
          {h.permissionGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">権限グループが作成されていません</p>
          ) : (
            h.permissionGroups.map((group) => (
              <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={h.groupEditSelected.includes(group.id)}
                  onCheckedChange={() => h.toggleGroupSelection(group.id)}
                />
                <div>
                  <span className="text-sm">{group.name}</span>
                  {group.description && (
                    <span className="text-xs text-muted-foreground ml-2">{group.description}</span>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </EditPanel>
    </div>
  );
}
